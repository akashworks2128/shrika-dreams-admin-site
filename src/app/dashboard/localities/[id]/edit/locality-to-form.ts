import type {
  LocalityFormState,
  ConnectivityRow,
  PriceTrendRow,
  WhyBuyRow,
} from "../../new/components/form-types";

type JsonRow = Record<string, unknown>;

// jsonb columns come back as arrays of objects (or null); coerce every value
// to a string so the form inputs stay controlled.
function toRows<T extends Record<string, string>>(
  value: unknown,
  keys: (keyof T & string)[],
): T[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = (item ?? {}) as JsonRow;
    const out: Record<string, string> = {};
    for (const key of keys) {
      const v = row[key];
      out[key] = v === null || v === undefined ? "" : String(v);
    }
    return out as T;
  });
}

function connectivityIconFromLabel(label: string): string {
  const value = label.toLowerCase();
  if (value.includes("airport")) return "airport";
  if (value.includes("school") || value.includes("college")) return "schools";
  if (value.includes("hospital")) return "hospitals";
  if (value.includes("mall") || value.includes("shopping")) return "shopping";
  if (value.includes("it park") || value.includes("itpl") || value.includes("it corridor")) return "itParks";
  return "metro";
}

export interface SupabaseLocality {
  name: string | null;
  slug: string | null;
  city: string | null;
  short_description: string | null;
  full_description: string | null;
  average_price: string | null;
  price_range: string | null;
  popular_bhk: string | null;
  active_projects: number | null;
  about_title: string | null;
  about_description: string | null;
  connectivity: unknown;
  price_trends: unknown;
  why_buy: unknown;
  hero_image_url: string | null;
  main_image_url: string | null;
  about_image_url: string | null;
}

export function localityToForm(row: SupabaseLocality): LocalityFormState {
  return {
    name: row.name ?? "",
    slug: row.slug ?? "",
    // Keep the saved slug: editing the name must not silently rewrite it.
    slugTouched: true,
    city: row.city ?? "Bangalore",

    shortDescription: row.short_description ?? "",
    fullDescription: row.full_description ?? "",
    averagePrice: row.average_price ?? "",
    priceRange: row.price_range ?? "",
    popularBhk: row.popular_bhk ?? "",
    activeProjects: row.active_projects == null ? "" : String(row.active_projects),
    aboutTitle: row.about_title ?? "",
    aboutDescription: row.about_description ?? "",

    connectivity: toRows<ConnectivityRow>(row.connectivity, ["label", "info", "icon"]).map((item) => ({
      ...item,
      icon: item.icon || connectivityIconFromLabel(item.label),
    })),
    priceTrends: toRows<PriceTrendRow>(row.price_trends, ["period", "price"]),
    whyBuy: toRows<WhyBuyRow>(row.why_buy, ["label", "info"]),

    heroImageUrl: row.hero_image_url ?? "",
    mainImageUrl: row.main_image_url ?? "",
    aboutImageUrl: row.about_image_url ?? "",
  };
}
