import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocalityFormState } from "./form-types";

function toStringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toJsonArrayOrEmpty<T extends Record<string, string>>(
  rows: readonly T[]
): T[] {
  return rows.filter((row) =>
    Object.values(row).some((value) => value.trim())
  );
}

/**
 * Every key here is a column confirmed in lib/localities-data.ts's schema
 * comment. No SEO, no Featured, no invented columns.
 */
export function buildLocalityPayload(
  form: LocalityFormState,
  isPublished: boolean
): Record<string, unknown> {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    city: toStringOrNull(form.city) ?? "Bangalore",

    short_description: toStringOrNull(form.shortDescription),
    full_description: toStringOrNull(form.fullDescription),
    average_price: toStringOrNull(form.averagePrice),
    price_range: toStringOrNull(form.priceRange),
    popular_bhk: toStringOrNull(form.popularBhk),
    active_projects: Number.isFinite(Number(form.activeProjects)) ? Math.max(0, Math.trunc(Number(form.activeProjects))) : 0,
    about_title: toStringOrNull(form.aboutTitle),
    about_description: toStringOrNull(form.aboutDescription),

    connectivity: toJsonArrayOrEmpty(form.connectivity),
    price_trends: toJsonArrayOrEmpty(form.priceTrends),
    why_buy: toJsonArrayOrEmpty(form.whyBuy),

    hero_image_url: toStringOrNull(form.heroImageUrl),
    main_image_url: toStringOrNull(form.mainImageUrl),
    about_image_url: toStringOrNull(form.aboutImageUrl),

    is_published: isPublished,
  };
}

export interface InsertLocalityResult {
  success: boolean;
  localityId?: string;
  error?: string;
}

export async function insertLocality(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<InsertLocalityResult> {
  try {
    const safePayload = {
      ...payload,

      connectivity: Array.isArray(payload.connectivity)
        ? payload.connectivity
        : [],

      price_trends: Array.isArray(payload.price_trends)
        ? payload.price_trends
        : [],

      why_buy: Array.isArray(payload.why_buy)
        ? payload.why_buy
        : [],
    };

    // Generate the UUID client-side so creation does not depend on a
    // SELECT policy being present after INSERT. The existing Projects flow
    // uses the same authenticated Supabase client and remains unchanged.
    const localityId = crypto.randomUUID();
    const { error } = await supabase
      .from("localities")
      .insert({ ...safePayload, id: localityId });

    if (error) {
      console.error("[create-locality] insert failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      localityId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function updateLocality(
  supabase: SupabaseClient,
  localityId: string,
  payload: Record<string, unknown>
): Promise<InsertLocalityResult> {
  try {
    const { error } = await supabase
      .from("localities")
      .update(payload)
      .eq("id", localityId);

    if (error) {
      console.error("[create-locality] update failed:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, localityId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function isSlugTaken(
  supabase: SupabaseClient,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase.from("localities").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error("[create-locality] slug check failed:", error.message);
    return false;
  }

  return Boolean(data);
}
