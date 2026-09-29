import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectFormState } from "./form-types";

/**
 * SCHEMA NOTE
 * ---------------------------------------------------------------------------
 * Columns confirmed against the real `projects` table in an earlier fix
 * (name, slug, builder_id, locality_id, property_type, status,
 * short_description, description, price_type, price_min, price_max,
 * price_display, price_unit, price_per_sqft, price_note, bhk_options,
 * configuration, area_range, total_units, available_units, plot_sizes,
 * area, area_unit, project_size, total_plots, possession_date, availability,
 * rera_number, address, city, pincode, latitude, longitude,
 * google_maps_url, map_embed_url, highlights, amenities,
 * nearby_landmarks, connectivity, brochure_url, brochure_title,
 * brochure_size, brochure_gated, is_featured, is_published, sort_order) are
 * sent unconditionally.
 *
 * `rera_url`, `launch_date`, `completion_date`, and `project_size_text`
 * were named in this form's brief but were NOT present in that last
 * confirmed schema dump. Rather than risk a hard failure (as happened
 * twice before with `published`/`featured`/`is_hero`), these four are only
 * included in the initial insert attempt; if Postgres reports any of them
 * as an unknown column (error 42703), insertProject strips just that
 * column and retries automatically, then reports which fields — if any —
 * couldn't be saved so nothing is silently lost without the admin knowing.
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

function toArrayOrNull(values: string[]): string[] | null {
  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

function toJsonArrayOrNull<T extends Record<string, string>>(
  rows: readonly T[]
): T[] | null {
  const cleaned = rows.filter((row) => Object.values(row).some((v) => v.trim()));
  return cleaned.length ? cleaned : null;
}

export function buildProjectPayload(
  form: ProjectFormState,
  isPublished: boolean
): Record<string, unknown> {
  const isApartment = form.propertyType === "Apartment";
  const isPlot = form.propertyType === "Plot";

  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    slug: form.slug.trim(),
    builder_id: form.builderId,
    locality_id: form.localityId,
    property_type: form.propertyType || null,
    status: form.status || null,
    short_description: toStringOrNull(form.shortDescription),
    description: toStringOrNull(form.description),

    price_type: form.priceType || null,
    price_min: toNumberOrNull(form.priceMin),
    price_max: form.priceType === "Fixed Price" ? null : toNumberOrNull(form.priceMax),
    price_display: toStringOrNull(form.priceDisplay),
    price_unit: toStringOrNull(form.priceUnit),
    price_per_sqft: toStringOrNull(form.pricePerSqft),
    price_note: toStringOrNull(form.priceNote),

    project_size: toStringOrNull(form.projectSize),
    total_units: isApartment ? toNumberOrNull(form.totalUnits) : null,
    total_plots: isPlot ? toNumberOrNull(form.totalPlots) : null,
    available_units: isApartment ? toNumberOrNull(form.availableUnits) : null,
    possession_date: toDateOrNull(form.possessionDate),
    availability: toStringOrNull(form.availability),
    rera_number: toStringOrNull(form.reraNumber),
    rera_url: toStringOrNull(form.reraUrl),
    launch_date: toDateOrNull(form.launchDate),
    completion_date: toDateOrNull(form.completionDate),

    bhk_options: isApartment ? toArrayOrNull(form.bhkOptions) : null,
    configuration: isApartment ? toStringOrNull(form.configuration) : null,
    area_range: isApartment ? toStringOrNull(form.areaRange) : null,
    plot_sizes: isPlot ? toArrayOrNull(form.plotSizes) : null,
    area: isPlot ? toStringOrNull(form.area) : null,
    area_unit: isPlot ? form.areaUnit || null : null,

    highlights: toArrayOrNull(form.highlights),
    amenities: toArrayOrNull(form.amenities),

    brochure_title: toStringOrNull(form.brochureTitle),
    brochure_url: toStringOrNull(form.brochureUrl),
    brochure_size: toStringOrNull(form.brochureSize),
    brochure_gated: form.brochureGated,

    address: toStringOrNull(form.address),
    city: toStringOrNull(form.city) ?? "Bangalore",
    pincode: toStringOrNull(form.pincode),
    latitude: toNumberOrNull(form.latitude),
    longitude: toNumberOrNull(form.longitude),
    google_maps_url: toStringOrNull(form.googleMapsUrl),
    map_embed_url: toStringOrNull(form.mapEmbedUrl),

    nearby_landmarks: toJsonArrayOrNull(form.nearbyLandmarks),
    connectivity: toJsonArrayOrNull(form.connectivity),

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
 * Inserts a project, defensively retrying without any column Postgres
 * reports as unknown (error 42703). This only ever drops columns from
 * POSSIBLY_UNCONFIRMED_COLUMNS — any other "column does not exist" error
 * is treated as a real failure and surfaced to the admin, since that would
 * indicate a genuine mismatch worth fixing rather than silently hiding.
 */
export async function insertProject(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<InsertProjectResult> {
  const workingPayload = { ...payload };
  const droppedColumns: string[] = [];

  for (let attempt = 0; attempt < POSSIBLY_UNCONFIRMED_COLUMNS.length + 1; attempt++) {
    const { data, error } = await supabase
      .from("projects")
      .insert(workingPayload)
      .select("id")
      .single();

    if (!error) {
      return { success: true, projectId: data.id as string, droppedColumns };
    }

    const undefinedColumnMatch =
      error.code === "42703" ? error.message.match(/column "?([a-z_]+)"?/i) : null;
    const unknownColumn = undefinedColumnMatch?.[1];

    if (
      unknownColumn &&
      (POSSIBLY_UNCONFIRMED_COLUMNS as readonly string[]).includes(unknownColumn) &&
      unknownColumn in workingPayload
    ) {
      delete workingPayload[unknownColumn];
      droppedColumns.push(unknownColumn);
      continue;
    }

    return { success: false, error: error.message, droppedColumns };
  }

  return {
    success: false,
    error: "Could not save the project after removing unrecognized fields.",
    droppedColumns,
  };
}

export async function isSlugTaken(supabase: SupabaseClient, slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[create-project] slug check failed:", error.message);
    return false;
  }

  return Boolean(data);
}
