import type { SupabaseClient } from "@supabase/supabase-js";

// Composable, dynamically built filter chains make the Supabase query
// builder's generic types impractical to express precisely without
// excessive casting. `any` is scoped to this one data-fetching module only,
// matching the same pattern used in projects-data.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * SCHEMA — confirmed against the real Supabase `localities` table
 * (columns provided directly, not assumed):
 *
 * localities: id (uuid), name, slug, city, short_description,
 *             full_description, hero_image_url, main_image_url,
 *             average_price, price_range, popular_bhk,
 *             active_projects (int), about_title, about_description,
 *             about_image_url, connectivity (jsonb), infrastructure (jsonb),
 *             price_trends (jsonb), why_buy (jsonb),
 *             is_published (bool), created_at, updated_at.
 *
 * NOTE: there is no `is_featured` column on `localities` (unlike
 * `projects`, which does have one) — so this page has no Featured
 * summary card, filter, or table column. Do not add one without a real
 * schema change.
 *
 * NOTE: `active_projects` is a stored integer column, but the project
 * count shown on this page is instead calculated live from the existing
 * `projects.locality_id` relationship (same relationship projects-data.ts
 * already uses to resolve a project's locality name), per the brief's
 * explicit instruction not to trust/duplicate a possibly-stale stored
 * count when the real relationship is available.
 *
 * NOTE: there is no separate `locality_images` table — the thumbnail
 * comes directly from the locality row's own `hero_image_url`, falling
 * back to `main_image_url`.
 */

export const PAGE_SIZE = 10;

export interface CityFilterOption {
  city: string;
}

export interface LocalitySummaryCounts {
  all: number;
  published: number;
  drafts: number;
}

export interface LocalityListItem {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  published: boolean;
  imageUrl: string | null;
  projectCount: number;
}

export interface LocalitiesQuery {
  search?: string;
  city?: string;
  status?: string; // "Published" | "Draft"
  page: number;
}

export interface LocalitiesResult {
  items: LocalityListItem[];
  totalCount: number;
  error: string | null;
}

async function safeCount(
  supabase: SupabaseClient,
  build: (query: any) => any
): Promise<number> {
  try {
    let query: any = supabase.from("localities").select("*", { count: "exact", head: true });
    query = build(query);
    const { count, error } = await query;
    if (error) {
      console.error("[localities-data] count failed:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[localities-data] count threw:", err);
    return 0;
  }
}

export async function getLocalitySummaryCounts(
  supabase: SupabaseClient
): Promise<LocalitySummaryCounts> {
  const [all, published, drafts] = await Promise.all([
    safeCount(supabase, (q) => q),
    safeCount(supabase, (q) => q.eq("is_published", true)),
    safeCount(supabase, (q) => q.eq("is_published", false)),
  ]);

  return { all, published, drafts };
}

/**
 * Distinct city values, populated from the actual locality data (per the
 * brief) rather than a hardcoded list.
 */
export async function getCityFilterOptions(
  supabase: SupabaseClient
): Promise<CityFilterOption[]> {
  try {
    const { data, error } = await supabase
      .from("localities")
      .select("city")
      .not("city", "is", null)
      .order("city", { ascending: true });

    if (error) {
      console.error("[localities-data] getCityFilterOptions failed:", error.message);
      return [];
    }

    const seen = new Set<string>();
    const cities: CityFilterOption[] = [];
    for (const row of (data ?? []) as { city: string | null }[]) {
      if (row.city && !seen.has(row.city)) {
        seen.add(row.city);
        cities.push({ city: row.city });
      }
    }
    return cities;
  } catch (err) {
    console.error("[localities-data] getCityFilterOptions threw:", err);
    return [];
  }
}

export async function getLocalities(
  supabase: SupabaseClient,
  query: LocalitiesQuery
): Promise<LocalitiesResult> {
  try {
    const from = (query.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let builder: any = supabase
      .from("localities")
      .select("id, name, slug, city, hero_image_url, main_image_url, is_published", {
        count: "exact",
      });

    if (query.search) {
      const term = query.search.replace(/[%,]/g, "\\$&");
      builder = builder.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
    }
    if (query.city) {
      builder = builder.eq("city", query.city);
    }
    if (query.status === "Published") {
      builder = builder.eq("is_published", true);
    } else if (query.status === "Draft") {
      builder = builder.eq("is_published", false);
    }

    builder = builder.order("name", { ascending: true }).range(from, to);

    const { data: localities, error, count } = await builder;

    if (error) {
      console.error("[localities-data] getLocalities failed:", error.message);
      return { items: [], totalCount: 0, error: error.message };
    }

    if (!localities || localities.length === 0) {
      return { items: [], totalCount: count ?? 0, error: null };
    }

    const localityIds = localities.map((l: any) => l.id as string);

    // Live project counts via the existing projects.locality_id
    // relationship, one row per project (id + locality_id only) so we
    // can tally counts client-side without a stored/duplicated column.
    const { data: projectRows, error: projectsError } = await supabase
      .from("projects")
      .select("id, locality_id")
      .in("locality_id", localityIds);

    if (projectsError) {
      console.error(
        "[localities-data] resolving project counts failed:",
        projectsError.message
      );
    }

    const countByLocalityId = new Map<string, number>();
    for (const row of (projectRows ?? []) as { locality_id: string | null }[]) {
      if (!row.locality_id) continue;
      countByLocalityId.set(
        row.locality_id,
        (countByLocalityId.get(row.locality_id) ?? 0) + 1
      );
    }

    const items: LocalityListItem[] = localities.map((l: any) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      city: l.city,
      published: Boolean(l.is_published),
      imageUrl: l.hero_image_url ?? l.main_image_url ?? null,
      projectCount: countByLocalityId.get(l.id) ?? 0,
    }));

    return { items, totalCount: count ?? items.length, error: null };
  } catch (err) {
    console.error("[localities-data] getLocalities threw:", err);
    return {
      items: [],
      totalCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function deleteLocalityById(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("localities").delete().eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
