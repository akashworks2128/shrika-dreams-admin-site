import type { BuilderFormState } from "../../new/components/form-types";

export interface SupabaseBuilder {
  name: string | null;
  slug: string | null;
  tagline: string | null;
  logo_url: string | null;
  image_url: string | null;
  short_description: string | null;
  about: string | null;
  website_url: string | null;
  founded_year: number | null;
  headquarters: string | null;
  years_experience: string | null;
  projects_count: string | null;
  is_published: boolean | null;
}

export function builderToForm(row: SupabaseBuilder): BuilderFormState {
  return {
    name: row.name ?? "",
    slug: row.slug ?? "",
    // Keep the saved slug: editing the name must not silently rewrite it.
    slugTouched: true,

    tagline: row.tagline ?? "",
    logoUrl: row.logo_url ?? "",
    imageUrl: row.image_url ?? "",

    shortDescription: row.short_description ?? "",
    about: row.about ?? "",

    yearsExperience: row.years_experience ?? "",
    projectsCount: row.projects_count ?? "",
  };
}
