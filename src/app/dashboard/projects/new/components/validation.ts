import type { ProjectFormState } from "./form-types";

export type FormErrors = Partial<Record<keyof ProjectFormState, string>>;

function isValidNumber(value: string): boolean {
  if (!value) return true;
  return !Number.isNaN(Number(value));
}

export function validateForm(form: ProjectFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Project name is required.";
  }
  if (!form.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  }
  if (!form.builderId) {
    errors.builderId = "Select a builder.";
  }
  if (!form.localityId) {
    errors.localityId = "Select a locality.";
  }
  if (!form.propertyType) {
    errors.propertyType = "Select a property type.";
  }
  if (!form.status) {
    errors.status = "Select a project status.";
  }

  if (form.priceMin && !isValidNumber(form.priceMin)) {
    errors.priceMin = "Enter a valid number.";
  }
  if (form.priceType === "Price Range") {
    if (!form.priceMax) {
      errors.priceMax = "Maximum price is required for a price range.";
    } else if (!isValidNumber(form.priceMax)) {
      errors.priceMax = "Enter a valid number.";
    }
  } else if (form.priceMax && !isValidNumber(form.priceMax)) {
    errors.priceMax = "Enter a valid number.";
  }

  const numericFields: (keyof ProjectFormState)[] = [
    "totalUnits",
    "totalPlots",
    "availableUnits",
    "latitude",
    "longitude",
    "sortOrder",
  ];
  for (const field of numericFields) {
    const value = form[field];
    if (typeof value === "string" && value && !isValidNumber(value)) {
      errors[field] = "Enter a valid number.";
    }
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}
