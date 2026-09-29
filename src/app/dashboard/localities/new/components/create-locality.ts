import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocalityFormState } from "./form-types";

function toStringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toJsonArrayOrNull<T extends Record<string, string>>(
  rows: readonly T[]
): T[] | null {
  const cleaned = rows.filter((row) => Object.values(row).some((v) => v.trim()));
  return cleaned.length ? cleaned : null;
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

    connectivity: toJsonArrayOrNull(form.connectivity),
    price_trends: toJsonArrayOrNull(form.priceTrends),

    hero_image_url: toStringOrNull(form.heroImageUrl),
    main_image_url: toStringOrNull(form.mainImageUrl),

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
    const { data, error } = await supabase
      .from("localities")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, localityId: data.id as string };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function isSlugTaken(supabase: SupabaseClient, slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("localities")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[create-locality] slug check failed:", error.message);
    return false;
  }

  return Boolean(data);
}
