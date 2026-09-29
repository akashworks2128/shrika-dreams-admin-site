import type { LocalityFormState } from "./form-types";

export type FormErrors = Partial<Record<keyof LocalityFormState, string>>;

export function validateForm(form: LocalityFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Locality name is required.";
  }
  if (!form.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  }
  if (!form.city.trim()) {
    errors.city = "City is required.";
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}
