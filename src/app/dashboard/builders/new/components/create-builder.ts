import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuilderFormState } from "./form-types";

function toStringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildBuilderPayload(
  form: BuilderFormState,
  isPublished: boolean
): Record<string, unknown> {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    tagline: toStringOrNull(form.tagline),
    logo_url: toStringOrNull(form.logoUrl),
    image_url: toStringOrNull(form.imageUrl),
    short_description: toStringOrNull(form.shortDescription),
    about: toStringOrNull(form.about),
    years_experience: toStringOrNull(form.yearsExperience),
    projects_count: toStringOrNull(form.projectsCount),
    is_published: isPublished,
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
    const builderId = crypto.randomUUID();
    const { error } = await supabase.from("builders").insert({ ...payload, id: builderId });
    if (error) return { success: false, error: error.message };
    return { success: true, builderId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateBuilder(
  supabase: SupabaseClient,
  builderId: string,
  payload: Record<string, unknown>
): Promise<InsertBuilderResult> {
  try {
    const { error } = await supabase.from("builders").update(payload).eq("id", builderId);
    if (error) return { success: false, error: error.message };
    return { success: true, builderId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function isSlugTaken(
  supabase: SupabaseClient,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase.from("builders").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    console.error("[create-builder] slug check failed:", error.message);
    return false;
  }
  return Boolean(data);
}
