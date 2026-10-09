export interface ConnectivityRow { [key: string]: string; label: string; info: string; icon: string; }
export interface PriceTrendRow { [key: string]: string; period: string; price: string; }
export interface WhyBuyRow { [key: string]: string; label: string; info: string; }

export interface LocalityFormState {
  name: string;
  slug: string;
  slugTouched: boolean;
  city: string;

  shortDescription: string;
  fullDescription: string;
  averagePrice: string;
  priceRange: string;
  popularBhk: string;
  activeProjects: string;
  aboutTitle: string;
  aboutDescription: string;

  connectivity: ConnectivityRow[];
  priceTrends: PriceTrendRow[];
  whyBuy: WhyBuyRow[];

  heroImageUrl: string;
  mainImageUrl: string;
  aboutImageUrl: string;
}

export const INITIAL_LOCALITY_FORM_STATE: LocalityFormState = {
  name: "",
  slug: "",
  slugTouched: false,
  city: "Bangalore",
  shortDescription: "",
  fullDescription: "",
  averagePrice: "",
  priceRange: "",
  popularBhk: "",
  activeProjects: "",
  aboutTitle: "",
  aboutDescription: "",
  connectivity: [],
  priceTrends: [],
  whyBuy: [],
  heroImageUrl: "",
  mainImageUrl: "",
  aboutImageUrl: "",
};

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
