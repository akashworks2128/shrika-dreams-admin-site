export const PROPERTY_TYPES = ["Apartment", "Plot"] as const;
export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number];

export const STATUS_OPTIONS = [
  "Ready to Move",
  "Under Construction",
  "New Launch",
  "Coming Soon",
  "Sold Out",
] as const;

export const PRICE_TYPES = ["Price Range", "Fixed Price"] as const;

export const PRICE_UNITS = ["Cr", "L"] as const;

export const AREA_UNITS = ["Acres", "Guntas", "Cents", "Sq Ft"] as const;

export interface LandmarkRow {
  [key: string]: string;
  name: string;
  distance: string;
}

export interface ConnectivityRow {
  [key: string]: string;
  label: string;
  info: string;
}

export interface ProjectFormState {
  // Section 1 — Basic Information
  name: string;
  slug: string;
  slugTouched: boolean;
  builderId: string;
  localityId: string;
  propertyType: PropertyTypeValue | "";
  status: string;
  shortDescription: string;
  description: string;

  // Section 2 — Pricing
  priceType: string;
  priceMin: string;
  priceMax: string;
  priceUnit: string;
  priceDisplay: string;
  pricePerSqft: string;
  priceNote: string;

  // Section 3 — Project Overview
  projectSize: string;
  totalUnits: string;
  totalPlots: string;
  availableUnits: string;
  possessionDate: string;
  availability: string;
  reraNumber: string;
  reraUrl: string;
  launchDate: string;
  completionDate: string;

  // Section 4 — Property Details (type-conditional)
  bhkOptions: string[];
  configuration: string;
  areaRange: string;
  plotSizes: string[];
  area: string;
  areaUnit: string;

  // Section 5 — Highlights & Amenities
  highlights: string[];
  amenities: string[];

  // Section 6 — Documents (Brochure). Images are placeholder-only, see AGENTS note.
  brochureTitle: string;
  brochureUrl: string;
  brochureSize: string;
  brochureGated: boolean;

  // Section 7 — Location & Map
  address: string;
  city: string;
  pincode: string;
  latitude: string;
  longitude: string;
  googleMapsUrl: string;
  mapEmbedUrl: string;

  // Section 8 — Nearby & Connectivity
  nearbyLandmarks: LandmarkRow[];
  connectivity: ConnectivityRow[];

  // Section 9 — Publishing
  isFeatured: boolean;
  sortOrder: string;
}

export const INITIAL_FORM_STATE: ProjectFormState = {
  name: "",
  slug: "",
  slugTouched: false,
  builderId: "",
  localityId: "",
  propertyType: "",
  status: "",
  shortDescription: "",
  description: "",

  priceType: "Price Range",
  priceMin: "",
  priceMax: "",
  priceUnit: "Cr",
  priceDisplay: "",
  pricePerSqft: "",
  priceNote: "",

  projectSize: "",
  totalUnits: "",
  totalPlots: "",
  availableUnits: "",
  possessionDate: "",
  availability: "",
  reraNumber: "",
  reraUrl: "",
  launchDate: "",
  completionDate: "",

  bhkOptions: [],
  configuration: "",
  areaRange: "",
  plotSizes: [],
  area: "",
  areaUnit: "Acres",

  highlights: [],
  amenities: [],

  brochureTitle: "",
  brochureUrl: "",
  brochureSize: "",
  brochureGated: false,

  address: "",
  city: "Bangalore",
  pincode: "",
  latitude: "",
  longitude: "",
  googleMapsUrl: "",
  mapEmbedUrl: "",

  nearbyLandmarks: [],
  connectivity: [],

  isFeatured: false,
  sortOrder: "0",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
