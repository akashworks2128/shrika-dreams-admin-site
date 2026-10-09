import type { LocalityFormState } from "./form-types";
export type FormErrors = Partial<Record<keyof LocalityFormState, string>>;

export function validateForm(form: LocalityFormState, forPublish = false, imagePresence?: { hero: boolean; main: boolean; about: boolean }): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Locality name is required.";
  if (!form.slug.trim()) errors.slug = "Slug is required.";
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  if (!form.city.trim()) errors.city = "City is required.";

  if (forPublish) {
    if (!form.shortDescription.trim()) errors.shortDescription = "Tagline is required to publish.";
    if (!form.fullDescription.trim()) errors.fullDescription = "Full description is required to publish.";
    if (!form.averagePrice.trim()) errors.averagePrice = "Average price is required to publish.";
    if (!form.popularBhk.trim()) errors.popularBhk = "Popular BHK is required to publish.";
    if (!form.aboutTitle.trim()) errors.aboutTitle = "About title is required to publish.";
    if (!form.aboutDescription.trim()) errors.aboutDescription = "About description is required to publish.";
    if (form.connectivity.filter(r => r.label.trim() && r.info.trim()).length === 0) errors.connectivity = "Select at least one connectivity option and add its description to publish.";
    if (form.priceTrends.filter(r => r.period.trim() && r.price.trim()).length === 0) errors.priceTrends = "Add at least one price trend to publish.";
    if (form.whyBuy.filter(r => r.label.trim() && r.info.trim()).length === 0) errors.whyBuy = "Add at least one reason to buy to publish.";
    if (!form.heroImageUrl.trim() && !imagePresence?.hero) errors.heroImageUrl = "Hero image is required to publish.";
    if (!form.mainImageUrl.trim() && !imagePresence?.main) errors.mainImageUrl = "Main image is required to publish.";
    if (!form.aboutImageUrl.trim() && !imagePresence?.about) errors.aboutImageUrl = "About image is required to publish.";
  }
  return errors;
}
export function hasErrors(errors: FormErrors): boolean { return Object.keys(errors).length > 0; }
