import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuilderFormState } from "./form-types";

function toStringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

/**
 * Every key here is a column confirmed in lib/builders-data.ts's schema
 * comment. No SEO, no Featured, no invented columns.
 */
export function buildBuilderPayload(form: BuilderFormState): Record<string, unknown> {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),

    logo_url: toStringOrNull(form.logoUrl),
    image_url: toStringOrNull(form.imageUrl),

    short_description: toStringOrNull(form.shortDescription),
    about: toStringOrNull(form.about),

    website_url: toStringOrNull(form.websiteUrl),
    founded_year: toIntOrNull(form.foundedYear),
    headquarters: toStringOrNull(form.headquarters),

    is_published: form.status === "Published",
  };
}

export interface InsertBuilderResult {
  success: boolean;
  builderId?: string;
  error?: string;
}

export async function insertBuilder(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<InsertBuilderResult> {
  try {
    const { data, error } = await supabase
      .from("builders")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, builderId: data.id as string };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function isSlugTaken(supabase: SupabaseClient, slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("builders")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[create-builder] slug check failed:", error.message);
    return false;
  }

  return Boolean(data);
}
