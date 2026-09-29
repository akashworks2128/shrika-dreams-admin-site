/**
 * SCOPE NOTE
 * ---------------------------------------------------------------------------
 * Fields here are limited to columns confirmed in lib/builders-data.ts's
 * schema comment: id, name, slug, logo_url, image_url, short_description,
 * about, website_url, founded_year (int), headquarters, is_published.
 *
 * Deliberately NOT included, because no matching product requirement /
 * column exists:
 * - Featured — confirmed not present on `builders`.
 * - SEO (seo_title/seo_description/seo_keywords/og_image_url/canonical_url)
 *   — these columns still exist in the live table but SEO is out of scope
 *   for this admin by explicit product decision; never referenced here.
 *
 * Unlike Add Project / Add Locality, this form has a single explicit
 * Status field (Published/Draft) rather than a Save Draft / Publish
 * button split — that's what this task's brief specifically asked for,
 * and `is_published` supports it directly.
 */

export interface BuilderFormState {
  name: string;
  slug: string;
  slugTouched: boolean;

  logoUrl: string;
  imageUrl: string;

  shortDescription: string;
  about: string;

  websiteUrl: string;
  foundedYear: string;
  headquarters: string;

  status: "Published" | "Draft";
}

export const INITIAL_BUILDER_FORM_STATE: BuilderFormState = {
  name: "",
  slug: "",
  slugTouched: false,

  logoUrl: "",
  imageUrl: "",

  shortDescription: "",
  about: "",

  websiteUrl: "",
  foundedYear: "",
  headquarters: "",

  status: "Draft",
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
