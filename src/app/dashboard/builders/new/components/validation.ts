import type { BuilderFormState } from "./form-types";

export type FormErrors = Partial<Record<keyof BuilderFormState, string>>;

export function validateForm(form: BuilderFormState, forPublish = false, imagePresence?: { logo: boolean; image: boolean }): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = "Builder name is required.";
  if (!form.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  }


  if (forPublish) {
    if (!form.tagline.trim()) errors.tagline = "Tagline is required to publish.";
    if (!form.yearsExperience.trim()) errors.yearsExperience = "Years of experience is required to publish.";
    if (!form.projectsCount.trim()) errors.projectsCount = "Projects count is required to publish.";
    if (!form.shortDescription.trim()) errors.shortDescription = "Short description is required to publish.";
    if (!form.about.trim()) errors.about = "About is required to publish.";
    if (!form.logoUrl.trim() && !imagePresence?.logo) errors.logoUrl = "Builder logo is required to publish.";
    if (!form.imageUrl.trim() && !imagePresence?.image) errors.imageUrl = "Builder hero image is required to publish.";
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}
