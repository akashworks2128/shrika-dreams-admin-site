import type { ProjectFormState } from "./form-types";
export type FormErrors = Partial<Record<keyof ProjectFormState | "images", string>>;
function isValidNumber(value: string): boolean { return !value || !Number.isNaN(Number(value)); }
function completeRows<T extends Record<string, string>>(rows: T[]): T[] { return rows.filter((row) => Object.values(row).every((value) => value.trim())); }

export function validateForm(form: ProjectFormState, forPublish = false, imageCount = 0): FormErrors {
  const errors: FormErrors = {};
  if (form.slug.trim() && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  }

  if (forPublish) {
    if (!form.name.trim()) errors.name = "Project name is required.";
    if (!form.slug.trim()) errors.slug = "Slug is required.";
    if (!form.builderId) errors.builderId = "Select a builder.";
    if (!form.localityId) errors.localityId = "Select a locality.";
    if (!form.propertyType) errors.propertyType = "Select a property type.";
    if (!form.status) errors.status = "Select a project status.";
  }

  if (form.priceMin && !isValidNumber(form.priceMin)) errors.priceMin = "Enter a valid number.";
  if (form.priceType === "Price Range") {
    if (forPublish && !form.priceMax) errors.priceMax = "Maximum price is required for a price range.";
    else if (form.priceMax && !isValidNumber(form.priceMax)) errors.priceMax = "Enter a valid number.";
  } else if (form.priceMax && !isValidNumber(form.priceMax)) errors.priceMax = "Enter a valid number.";

  for (const field of ["projectSize", "totalUnits", "totalPlots", "availableUnits", "latitude", "longitude", "sortOrder"] as const) {
    const value = form[field];
    if (value && !isValidNumber(value)) errors[field] = "Enter a valid number.";
  }

  if (forPublish) {
    if (!form.priceMin.trim()) errors.priceMin = "Starting price is required to publish.";
    if (!form.configurations.some((row) => row.configuration.trim() && row.area.trim() && row.price.trim() && row.availability.trim())) errors.configurations = "Add at least one complete pricing configuration to publish.";
    if (!form.projectSize.trim()) errors.projectSize = "Project size is required to publish.";
    if (!form.possessionDate.trim()) errors.possessionDate = "Possession / availability date is required to publish.";
    if (!form.availability.trim()) errors.availability = "Availability is required to publish.";
    if (!form.highlights.length) errors.highlights = "Add at least one highlight to publish.";
    if (!form.amenities.length) errors.amenities = "Add at least one amenity to publish.";
    if (!form.address.trim()) errors.address = "Project address is required to publish.";
    if (!form.city.trim()) errors.city = "City is required to publish.";
    if (imageCount === 0) errors.images = "Add at least one project image to publish.";
    if (completeRows(form.nearbyLandmarks).length === 0) errors.nearbyLandmarks = "Add at least one nearby landmark with distance.";
    if (completeRows(form.connectivity).length === 0) errors.connectivity = "Add at least one connectivity point with information.";

    if (form.propertyType === "Apartment") {
      if (!form.bhkOptions.length) errors.bhkOptions = "Add at least one BHK option to publish.";
      if (!form.configuration.trim()) errors.configuration = "Configuration is required to publish apartments.";
      if (!form.areaRange.trim()) errors.areaRange = "Area range is required to publish apartments.";
      if (!form.totalUnits.trim()) errors.totalUnits = "Total units are required to publish apartments.";
      if (!form.availableUnits.trim()) errors.availableUnits = "Available units are required to publish apartments.";
    }

    if (form.propertyType === "Plot") {
      if (!form.plotSizes.length) errors.plotSizes = "Add at least one plot size to publish.";
      if (!form.area.trim()) errors.area = "Plot area is required to publish.";
      if (!form.totalPlots.trim()) errors.totalPlots = "Total plots are required to publish.";
    }
  }
  return errors;
}
export function hasErrors(errors: FormErrors): boolean { return Object.keys(errors).length > 0; }
