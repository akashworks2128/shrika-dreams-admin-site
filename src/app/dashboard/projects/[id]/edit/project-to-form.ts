import type { ProjectFormState } from "../../new/components/form-types";

type JsonRow = Record<string, string>;

type SupabaseProject = {
  id: string;
  name: string;
  slug: string;
  builder_id: string | null;
  locality_id: string | null;

  property_type: "Apartment" | "Plot";
  status: string;

  description: string | null;

  price_type: string;
  price_min: number | null;
  price_max: number | null;
  price_display: string | null;
  price_unit: string | null;
  price_per_sqft: string | null;
  price_note: string | null;

  bhk_options: string[] | null;
  configuration: string | null;
  area_range: string | null;

  total_units: number | null;
  available_units: number | null;

  plot_sizes: string[] | null;
  area: string | null;
  area_unit: string | null;

  project_size: string | null;
  total_plots: number | null;

  possession_date: string | null;
  availability: string | null;

  rera_number: string | null;
  rera_url: string | null;
  launch_date: string | null;
  completion_date: string | null;

  highlights: unknown;
  amenities: unknown;

  brochure_title: string | null;
  brochure_url: string | null;
  brochure_size: string | null;
  brochure_gated: boolean;

  address: string | null;
  city: string | null;
  pincode: number | string | null;
  latitude: number | null;
  longitude: number | null;

  google_maps_url: string | null;
  map_embed_url: string | null;

  project_configurations?: Array<{ id?: string; configuration: string; area: string; price: string; availability: string; sort_order: number | null }>;

  nearby_landmarks: unknown;
  connectivity: unknown;

  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
};

function stringValue(value: unknown): string {
  return value == null ? "" : String(value);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function landmarkRows(value: unknown): { name: string; distance: string }[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is JsonRow =>
        typeof item === "object" &&
        item !== null &&
        typeof item.name === "string" &&
        typeof item.distance === "string"
    )
    .map((item) => ({
      name: item.name,
      distance: item.distance,
    }));
}

function connectivityRows(value: unknown): { label: string; info: string }[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is JsonRow =>
        typeof item === "object" &&
        item !== null &&
        typeof item.label === "string" &&
        typeof item.info === "string"
    )
    .map((item) => ({
      label: item.label,
      info: item.info,
    }));
}

function dateValue(value: string | null): string {
  if (!value) return "";

  // The form uses <input type="date">,
  // so keep only YYYY-MM-DD when a timestamp is returned.
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function projectToForm(
  project: SupabaseProject
): ProjectFormState {
  return {
    name: project.name ?? "",
    slug: project.slug ?? "",
    slugTouched: true,

    builderId: project.builder_id ?? "",
    localityId: project.locality_id ?? "",

    propertyType: project.property_type ?? "",
    status: project.status ?? "",

    description: project.description ?? "",

    priceType: project.price_type ?? "Price Range",
    priceMin: stringValue(project.price_min),
    priceMax: stringValue(project.price_max),
    priceUnit: project.price_unit ?? "Cr",
    priceDisplay: project.price_display ?? "",
    pricePerSqft: project.price_per_sqft ?? "",
    priceNote: project.price_note ?? "",

    projectSize: project.project_size?.replace(/\s+(Acres|Guntas|Cents|Sq Ft)$/i, "") ?? "",
    projectSizeUnit: project.project_size?.match(/(Acres|Guntas|Cents|Sq Ft)$/i)?.[1] ?? "Acres",
    totalUnits: stringValue(project.total_units),
    totalPlots: stringValue(project.total_plots),
    availableUnits: stringValue(project.available_units),

    possessionDate: dateValue(project.possession_date),
    availability: project.availability ?? "",

    reraNumber: project.rera_number ?? "",
    reraUrl: project.rera_url ?? "",
    launchDate: dateValue(project.launch_date),
    completionDate: dateValue(project.completion_date),

    bhkOptions: stringArray(project.bhk_options),
    configuration: project.configuration ?? "",
    areaRange: project.area_range ?? "",

    plotSizes: stringArray(project.plot_sizes),
    area: project.area ?? "",
    areaUnit: project.area_unit ?? "Acres",

    highlights: stringArray(project.highlights),
    amenities: stringArray(project.amenities),

    brochureTitle: project.brochure_title ?? "",
    brochureUrl: project.brochure_url ?? "",
    brochureSize: project.brochure_size ?? "",
    brochureGated: project.brochure_gated ?? false,

    address: project.address ?? "",
    city: project.city ?? "Bangalore",
    pincode: stringValue(project.pincode),

    latitude: stringValue(project.latitude),
    longitude: stringValue(project.longitude),

    googleMapsUrl: project.google_maps_url ?? "",
    mapEmbedUrl: project.map_embed_url ?? "",

    nearbyLandmarks: landmarkRows(project.nearby_landmarks),
    connectivity: connectivityRows(project.connectivity),

    configurations: (project.project_configurations ?? []).map((row) => ({
      id: row.id,
      configuration: row.configuration ?? "",
      area: row.area ?? "",
      price: row.price ?? "",
      priceUnit: /\bCr\b/i.test(row.price ?? "") ? "Cr" : "L",
      availability: row.availability ?? "",
      sortOrder: String(row.sort_order ?? 0),
    })),

    isFeatured: project.is_featured ?? false,
    sortOrder: stringValue(project.sort_order),
  };
}