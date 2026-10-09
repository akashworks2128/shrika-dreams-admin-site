import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectFormState } from "./form-types";
import { formatPriceRange, formatDistance } from "./formatters";

/**
 * SCHEMA NOTE
 * ---------------------------------------------------------------------------
 * Columns confirmed against the real `projects` table:
 *
 * name, slug, builder_id, locality_id, property_type, status,
 * description, price_type, price_min, price_max,
 * price_display, price_unit, price_per_sqft, price_note, bhk_options,
 * configuration, area_range, total_units, available_units, plot_sizes,
 * area, area_unit, project_size, total_plots, possession_date, availability,
 * rera_number, rera_url, launch_date, completion_date, project_size_text,
 * address, city, pincode, latitude, longitude,
 * google_maps_url, map_embed_url, highlights, amenities,
 * nearby_landmarks, connectivity, brochure_url, brochure_title,
 * brochure_size, brochure_gated, is_featured, is_published, sort_order.
 *
 * IMPORTANT:
 * `highlights`, `amenities`, `nearby_landmarks`, and `connectivity`
 * are NOT NULL JSON/array fields in the database.
 *
 * Therefore, empty form values must be saved as [] and NEVER as null.
 */

const POSSIBLY_UNCONFIRMED_COLUMNS = [
  "rera_url",
  "launch_date",
  "completion_date",
  "project_size_text",
] as const;

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;

  const n = Number(value);

  return Number.isNaN(n) ? null : n;
}

function toStringOrNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function toDateOrNull(value: string): string | null {
  return value.trim() ? value : null;
}

/**
 * Converts a string array into a clean array.
 *
 * IMPORTANT:
 * Returns [] instead of null because the database expects
 * array fields such as highlights/amenities to be NOT NULL.
 */
function toArrayOrEmpty(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

/**
 * Converts JSON object rows into a clean array.
 *
 * IMPORTANT:
 * Returns [] instead of null because the database expects
 * nearby_landmarks/connectivity to be NOT NULL JSONB arrays.
 */
function toJsonArrayOrEmpty<T extends Record<string, string>>(
  rows: readonly T[]
): T[] {
  return rows.filter((row) =>
    Object.values(row).some((value) => value.trim())
  );
}

export function buildProjectPayload(
  form: ProjectFormState,
  isPublished: boolean
): Record<string, unknown> {
  const isApartment = form.propertyType === "Apartment";
  const isPlot = form.propertyType === "Plot";

  const payload: Record<string, unknown> = {
    // -----------------------------------------------------------------------
    // BASIC INFORMATION
    // -----------------------------------------------------------------------
    name: form.name.trim(),
    slug: form.slug.trim(),

    builder_id: form.builderId,
    locality_id: form.localityId,

    property_type: form.propertyType || null,
    status: form.status || null,

    description: toStringOrNull(form.description),

    // -----------------------------------------------------------------------
    // PRICING
    // -----------------------------------------------------------------------
    price_type: form.priceType || null,

    price_min: toNumberOrNull(form.priceMin),

    price_max:
      form.priceType === "Fixed Price"
        ? null
        : toNumberOrNull(form.priceMax),

    price_display: toStringOrNull(
      formatPriceRange(form.priceMin, form.priceMax, form.priceUnit, form.priceType)
    ),
    price_unit: toStringOrNull(form.priceUnit),
    price_per_sqft: toStringOrNull(form.pricePerSqft),
    price_note: toStringOrNull(form.priceNote),

    // -----------------------------------------------------------------------
    // PROPERTY DETAILS
    // -----------------------------------------------------------------------
    project_size: toStringOrNull(form.projectSize ? `${form.projectSize} ${form.projectSizeUnit}` : ""),

    total_units: isApartment
      ? toNumberOrNull(form.totalUnits)
      : null,

    total_plots: isPlot
      ? toNumberOrNull(form.totalPlots)
      : null,

    available_units: isApartment
      ? toNumberOrNull(form.availableUnits)
      : null,

    possession_date: toDateOrNull(form.possessionDate),
    availability: toStringOrNull(form.availability),

    rera_number: toStringOrNull(form.reraNumber),
    rera_url: toStringOrNull(form.reraUrl),

    launch_date: toDateOrNull(form.launchDate),
    completion_date: toDateOrNull(form.completionDate),

    // -----------------------------------------------------------------------
    // APARTMENT / PLOT SPECIFIC DATA
    // -----------------------------------------------------------------------
    bhk_options: isApartment
      ? toArrayOrEmpty(form.bhkOptions)
      : null,

    configuration: isApartment
      ? toStringOrNull(form.configuration)
      : null,

    area_range: isApartment
      ? toStringOrNull(form.areaRange)
      : null,

    plot_sizes: isPlot
      ? toArrayOrEmpty(form.plotSizes)
      : null,

    area: isPlot
      ? toStringOrNull(form.area)
      : null,

    area_unit: isPlot
      ? form.areaUnit || null
      : null,

    // -----------------------------------------------------------------------
    // HIGHLIGHTS & AMENITIES
    // -----------------------------------------------------------------------
    // IMPORTANT: These must NEVER be null.
    highlights: toArrayOrEmpty(form.highlights),

    amenities: toArrayOrEmpty(form.amenities),

    // -----------------------------------------------------------------------
    // BROCHURE
    // -----------------------------------------------------------------------
    brochure_title: toStringOrNull(form.brochureTitle),
    brochure_url: toStringOrNull(form.brochureUrl),
    brochure_size: toStringOrNull(form.brochureSize),
    brochure_gated: form.brochureGated,

    // -----------------------------------------------------------------------
    // LOCATION
    // -----------------------------------------------------------------------
    address: toStringOrNull(form.address),

    city: toStringOrNull(form.city) ?? "Bangalore",

    pincode: toStringOrNull(form.pincode),

    latitude: toNumberOrNull(form.latitude),
    longitude: toNumberOrNull(form.longitude),

    google_maps_url: toStringOrNull(form.googleMapsUrl),
    map_embed_url: toStringOrNull(form.mapEmbedUrl),

    // -----------------------------------------------------------------------
    // NEARBY & CONNECTIVITY
    // -----------------------------------------------------------------------
    // IMPORTANT: These must NEVER be null.
    nearby_landmarks: toJsonArrayOrEmpty(form.nearbyLandmarks).map((row) => ({
      ...row,
      distance: formatDistance(row.distance),
    })),

    connectivity: toJsonArrayOrEmpty(form.connectivity),

    // -----------------------------------------------------------------------
    // PUBLISHING
    // -----------------------------------------------------------------------
    is_featured: form.isFeatured,

    is_published: isPublished,

    sort_order: toNumberOrNull(form.sortOrder) ?? 0,
  };

  return payload;
}

export interface InsertProjectResult {
  success: boolean;
  projectId?: string;
  error?: string;
  droppedColumns: string[];
}

/**
 * Inserts a project into Supabase.
 *
 * If Postgres reports that one of the possibly-unconfirmed columns
 * does not exist, that specific column is removed and the insert
 * is retried.
 */
export async function insertProject(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<InsertProjectResult> {
  const workingPayload = { ...payload };

  const droppedColumns: string[] = [];

  for (
    let attempt = 0;
    attempt < POSSIBLY_UNCONFIRMED_COLUMNS.length + 1;
    attempt++
  ) {
    const { data, error } = await supabase
      .from("projects")
      .insert(workingPayload)
      .select("id")
      .single();

    // -----------------------------------------------------------------------
    // SUCCESS
    // -----------------------------------------------------------------------
    if (!error) {
      return {
        success: true,
        projectId: data.id as string,
        droppedColumns,
      };
    }

    // -----------------------------------------------------------------------
    // UNKNOWN COLUMN
    // -----------------------------------------------------------------------
    const undefinedColumnMatch =
      error.code === "42703"
        ? error.message.match(/column "?([a-z_]+)"?/i)
        : null;

    const unknownColumn = undefinedColumnMatch?.[1];

    if (
      unknownColumn &&
      (POSSIBLY_UNCONFIRMED_COLUMNS as readonly string[]).includes(
        unknownColumn
      ) &&
      unknownColumn in workingPayload
    ) {
      delete workingPayload[unknownColumn];

      droppedColumns.push(unknownColumn);

      continue;
    }

    // -----------------------------------------------------------------------
    // REAL DATABASE ERROR
    // -----------------------------------------------------------------------
    return {
      success: false,
      error: error.message,
      droppedColumns,
    };
  }

  return {
    success: false,
    error:
      "Could not save the project after removing unrecognized fields.",
    droppedColumns,
  };
}
export interface UpdateProjectResult {
  success: boolean;
  projectId?: string;
  error?: string;
  droppedColumns: string[];
}

/**
 * Updates an existing project in Supabase.
 */
export async function updateProject(
  supabase: SupabaseClient,
  projectId: string,
  payload: Record<string, unknown>
): Promise<UpdateProjectResult> {
  const workingPayload = { ...payload };
  const droppedColumns: string[] = [];

  for (
    let attempt = 0;
    attempt < POSSIBLY_UNCONFIRMED_COLUMNS.length + 1;
    attempt++
  ) {
    const { data, error } = await supabase
      .from("projects")
      .update(workingPayload)
      .eq("id", projectId)
      .select("id")
      .single();

    if (!error) {
      return {
        success: true,
        projectId: data.id as string,
        droppedColumns,
      };
    }

    const undefinedColumnMatch =
      error.code === "42703"
        ? error.message.match(/column "?([a-z_]+)"?/i)
        : null;

    const unknownColumn = undefinedColumnMatch?.[1];

    if (
      unknownColumn &&
      (POSSIBLY_UNCONFIRMED_COLUMNS as readonly string[]).includes(
        unknownColumn
      ) &&
      unknownColumn in workingPayload
    ) {
      delete workingPayload[unknownColumn];
      droppedColumns.push(unknownColumn);
      continue;
    }

    return {
      success: false,
      error: error.message,
      droppedColumns,
    };
  }

  return {
    success: false,
    error: "Could not update the project after removing unrecognized fields.",
    droppedColumns,
  };
}

/**
 * Checks whether a project slug is already used by another project.
 *
 * The current project is excluded during edit.
 */
export async function isProjectSlugTaken(
  supabase: SupabaseClient,
  slug: string,
  currentProjectId?: string
): Promise<boolean> {
  let query = supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (currentProjectId) {
    query = query.neq("id", currentProjectId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(
      "[create-project] slug check failed:",
      error.message
    );

    return false;
  }

  return Boolean(data);
}
/**
 * Checks whether a project slug already exists.
 */
export async function isSlugTaken(
  supabase: SupabaseClient,
  slug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[create-project] slug check failed:",
      error.message
    );

    return false;
  }

  return Boolean(data);
}

export interface ProjectConfigurationRow {
  id?: string;
  project_id?: string;
  configuration: string;
  area: string;
  price: string;
  availability: string;
  sort_order: number;
}

export async function syncProjectConfigurations(
  supabase: SupabaseClient,
  projectId: string,
  rows: ProjectConfigurationRow[],
): Promise<{ success: boolean; error?: string }> {
  const { error: deleteError } = await supabase
    .from("project_configurations")
    .delete()
    .eq("project_id", projectId);

  if (deleteError) return { success: false, error: deleteError.message };
  if (!rows.length) return { success: true };

  const payload = rows.map((row, index) => ({
    project_id: projectId,
    configuration: row.configuration.trim(),
    area: row.area.trim(),
    price: row.price.trim(),
    availability: row.availability.trim(),
    sort_order: Number.isFinite(row.sort_order) ? row.sort_order : index,
  }));

  const { error } = await supabase.from("project_configurations").insert(payload);
  return error ? { success: false, error: error.message } : { success: true };
}
