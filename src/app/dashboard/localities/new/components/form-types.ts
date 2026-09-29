/**
 * SCOPE NOTE
 * ---------------------------------------------------------------------------
 * Fields here are limited to columns confirmed in lib/localities-data.ts's
 * schema comment: id, name, slug, city, short_description, full_description,
 * hero_image_url, main_image_url, average_price, price_range, popular_bhk,
 * active_projects, about_title, about_description, about_image_url,
 * connectivity (jsonb), infrastructure (jsonb), price_trends (jsonb),
 * why_buy (jsonb), is_published (bool).
 *
 * Deliberately NOT included, because no matching column exists:
 * - Location fields (address/latitude/longitude/google_maps_url/
 *   map_embed_url) — none of these exist on `localities`.
 * - Nearby Landmarks — no matching column (infrastructure/why_buy are
 *   different concepts and were not asked for by this brief).
 * - Featured — confirmed not present on `localities`.
 * - SEO (seo_title/seo_description/seo_keywords/og_image_url/canonical_url)
 *   — columns have been dropped from the database entirely; SEO is out of
 *   scope for this admin by explicit product decision.
 *
 * There is no separate "Status" field: is_published is set by which submit
 * button is used (Save as Draft vs Publish Locality), matching the same
 * convention already established in the Add Project form, rather than
 * duplicating that choice in a redundant dropdown.
 */

export interface ConnectivityRow {
  [key: string]: string;
  label: string;
  info: string;
}

export interface PriceTrendRow {
  [key: string]: string;
  period: string;
  price: string;
}

export interface LocalityFormState {
  // Section 1 — Basic Information
  name: string;
  slug: string;
  slugTouched: boolean;
  city: string;

  // Section 2 — Overview
  shortDescription: string;
  fullDescription: string;

  // Section 3 — Connectivity
  connectivity: ConnectivityRow[];

  // Section 4 — Price Trends
  priceTrends: PriceTrendRow[];

  // Section 5 — Images
  heroImageUrl: string;
  mainImageUrl: string;
}

export const INITIAL_LOCALITY_FORM_STATE: LocalityFormState = {
  name: "",
  slug: "",
  slugTouched: false,
  city: "Bangalore",

  shortDescription: "",
  fullDescription: "",

  connectivity: [],

  priceTrends: [],

  heroImageUrl: "",
  mainImageUrl: "",
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
