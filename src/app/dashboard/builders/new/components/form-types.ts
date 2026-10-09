export interface BuilderFormState {
  name: string;
  slug: string;
  slugTouched: boolean;

  tagline: string;
  logoUrl: string;
  imageUrl: string;

  shortDescription: string;
  about: string;

  yearsExperience: string;
  projectsCount: string;
}

export const INITIAL_BUILDER_FORM_STATE: BuilderFormState = {
  name: "",
  slug: "",
  slugTouched: false,

  tagline: "",
  logoUrl: "",
  imageUrl: "",

  shortDescription: "",
  about: "",

  yearsExperience: "",
  projectsCount: "",
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
