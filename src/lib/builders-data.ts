import type { SupabaseClient } from "@supabase/supabase-js";

// Composable, dynamically built filter chains make the Supabase query
// builder's generic types impractical to express precisely without
// excessive casting. `any` is scoped to this one data-fetching module only,
// matching the same pattern used in projects-data.ts and localities-data.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * SCHEMA — confirmed against the real Supabase `builders` table
 * (columns provided directly, not assumed):
 *
 * builders: id (uuid), name, slug, logo_url, image_url,
 *           short_description, about, website_url, founded_year (int),
 *           headquarters, seo_title, seo_description, seo_keywords,
 *           og_image_url, canonical_url, is_published (bool),
 *           created_at, updated_at.
 *
 * NOTE: there is no `is_featured` column on `builders` — so this page has
 * no Featured summary card, filter, or table column, same as Localities.
 *
 * NOTE: the seo_* / og_image_url / canonical_url columns still exist in
 * the live table (a migration to drop them exists in this repo but has
 * not been applied yet), but SEO is explicitly out of scope for this
 * Admin system per the brief — this module deliberately never selects,
 * displays, filters by, or otherwise exposes them anywhere on this page.
 *
 * NOTE: there is no separate `builder_images` table — the thumbnail
 * comes directly from the builder row's own `logo_url`, falling back to
 * `image_url`.
 */

export const PAGE_SIZE = 10;

export interface BuilderSummaryCounts {
  all: number;
  published: number;
  drafts: number;
}

export interface BuilderListItem {
  id: string;
  name: string;
  slug: string | null;
  published: boolean;
  imageUrl: string | null;
  projectCount: number;
}

export interface BuildersQuery {
  search?: string;
  status?: string; // "Published" | "Draft"
  page: number;
}

export interface BuildersResult {
  items: BuilderListItem[];
  totalCount: number;
  error: string | null;
}

async function safeCount(
  supabase: SupabaseClient,
  build: (query: any) => any
): Promise<number> {
  try {
    let query: any = supabase.from("builders").select("*", { count: "exact", head: true });
    query = build(query);
    const { count, error } = await query;
    if (error) {
      console.error("[builders-data] count failed:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[builders-data] count threw:", err);
    return 0;
  }
}

export async function getBuilderSummaryCounts(
  supabase: SupabaseClient
): Promise<BuilderSummaryCounts> {
  const [all, published, drafts] = await Promise.all([
    safeCount(supabase, (q) => q),
    safeCount(supabase, (q) => q.eq("is_published", true)),
    safeCount(supabase, (q) => q.eq("is_published", false)),
  ]);

  return { all, published, drafts };
}

export async function getBuilders(
  supabase: SupabaseClient,
  query: BuildersQuery
): Promise<BuildersResult> {
  try {
    const from = (query.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let builder: any = supabase
      .from("builders")
      .select("id, name, slug, logo_url, image_url, is_published", { count: "exact" });

    if (query.search) {
      const term = query.search.replace(/[%,]/g, "\\$&");
      builder = builder.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
    }
    if (query.status === "Published") {
      builder = builder.eq("is_published", true);
    } else if (query.status === "Draft") {
      builder = builder.eq("is_published", false);
    }

    builder = builder.order("name", { ascending: true }).range(from, to);

    const { data: builders, error, count } = await builder;

    if (error) {
      console.error("[builders-data] getBuilders failed:", error.message);
      return { items: [], totalCount: 0, error: error.message };
    }

    if (!builders || builders.length === 0) {
      return { items: [], totalCount: count ?? 0, error: null };
    }

    const builderIds = builders.map((b: any) => b.id as string);

    // Live project counts via the existing projects.builder_id
    // relationship, one row per project (id + builder_id only) so we can
    // tally counts client-side without a stored/duplicated column.
    const { data: projectRows, error: projectsError } = await supabase
      .from("projects")
      .select("id, builder_id")
      .in("builder_id", builderIds);

    if (projectsError) {
      console.error("[builders-data] resolving project counts failed:", projectsError.message);
    }

    const countByBuilderId = new Map<string, number>();
    for (const row of (projectRows ?? []) as { builder_id: string | null }[]) {
      if (!row.builder_id) continue;
      countByBuilderId.set(row.builder_id, (countByBuilderId.get(row.builder_id) ?? 0) + 1);
    }

    const items: BuilderListItem[] = builders.map((b: any) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      published: Boolean(b.is_published),
      imageUrl: b.logo_url ?? b.image_url ?? null,
      projectCount: countByBuilderId.get(b.id) ?? 0,
    }));

    return { items, totalCount: count ?? items.length, error: null };
  } catch (err) {
    console.error("[builders-data] getBuilders threw:", err);
    return {
      items: [],
      totalCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function deleteBuilderById(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("builders").delete().eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
