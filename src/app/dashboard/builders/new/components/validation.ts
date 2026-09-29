import type { BuilderFormState } from "./form-types";

export type FormErrors = Partial<Record<keyof BuilderFormState, string>>;

function isValidNumber(value: string): boolean {
  if (!value) return true;
  return !Number.isNaN(Number(value));
}

export function validateForm(form: BuilderFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Builder name is required.";
  }

  if (!form.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  }

  if (form.foundedYear && !isValidNumber(form.foundedYear)) {
    errors.foundedYear = "Enter a valid year.";
  } else if (form.foundedYear) {
    const year = Number(form.foundedYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1800 || year > currentYear) {
      errors.foundedYear = `Enter a year between 1800 and ${currentYear}.`;
    }
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}
