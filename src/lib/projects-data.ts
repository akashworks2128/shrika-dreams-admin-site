import type { SupabaseClient } from "@supabase/supabase-js";

// The Supabase query builder's generic types make composable, dynamically
// built filter chains (search + multiple optional .eq() filters) impractical
// to type precisely without excessive casting. `any` is scoped to this one
// data-fetching module only.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * SCHEMA — confirmed against the real Supabase `projects` table.
 * ---------------------------------------------------------------------------
 * projects:        id, name, slug, builder_id, locality_id, property_type
 *                  ('Apartment' | 'Plot'), status ('Ready to Move' |
 *                  'Under Construction' | 'New Launch'), price_type
 *                  ('Price Range' | 'Fixed Price'), price_min, price_max,
 *                  price_display, price_unit, price_per_sqft, price_note,
 *                  is_featured (bool, default false), is_published (bool,
 *                  default true), sort_order, created_at, updated_at.
 *                  NOTE: the publish/feature flags are `is_published` and
 *                  `is_featured` — NOT `published` / `featured`.
 * builders:        id, name, slug
 * localities:      id, name, slug, city
 * project_images:  id, project_id, image_url, image_type, alt_text,
 *                  sort_order. There is no boolean "is_hero" column — the
 *                  hero image is picked as the one whose image_type equals
 *                  "hero" (case-insensitive), falling back to the lowest
 *                  sort_order. If your image_type values use a different
 *                  label for the hero shot, update HERO_IMAGE_TYPE below.
 */
const HERO_IMAGE_TYPE = "hero";

export const PAGE_SIZE = 10;

export type PropertyType = "Apartment" | "Plot";
export type ProjectStatus = "Ready to Move" | "Under Construction" | "New Launch";

export interface FilterOption {
  id: string;
  name: string;
}

export interface ProjectSummaryCounts {
  all: number;
  published: number;
  drafts: number;
  featured: number;
}

export interface ProjectListItem {
  id: string;
  name: string;
  slug: string | null;
  builderName: string | null;
  localityName: string | null;
  propertyType: string | null;
  status: string | null;
  featured: boolean;
  published: boolean;
  imageUrl: string | null;
  priceLine: string;
  priceSuffix: string | null;
}

export interface ProjectsQuery {
  search?: string;
  localityId?: string;
  builderId?: string;
  propertyType?: string;
  status?: string;
  page: number;
}

export interface ProjectsResult {
  items: ProjectListItem[];
  totalCount: number;
  error: string | null;
}

async function safeCount(
  supabase: SupabaseClient,
  build: (query: any) => any
): Promise<number> {
  try {
    let query: any = supabase.from("projects").select("*", { count: "exact", head: true });
    query = build(query);
    const { count, error } = await query;
    if (error) {
      console.error("[projects-data] count failed:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[projects-data] count threw:", err);
    return 0;
  }
}

export async function getProjectSummaryCounts(
  supabase: SupabaseClient
): Promise<ProjectSummaryCounts> {
  const [all, published, drafts, featured] = await Promise.all([
    safeCount(supabase, (q) => q),
    safeCount(supabase, (q) => q.eq("is_published", true)),
    safeCount(supabase, (q) => q.eq("is_published", false)),
    safeCount(supabase, (q) => q.eq("is_featured", true)),
  ]);

  return { all, published, drafts, featured };
}

export async function getFilterOptions(supabase: SupabaseClient): Promise<{
  localities: FilterOption[];
  builders: FilterOption[];
}> {
  try {
    const [localitiesRes, buildersRes] = await Promise.all([
      supabase.from("localities").select("id, name").order("name", { ascending: true }),
      supabase.from("builders").select("id, name").order("name", { ascending: true }),
    ]);

    if (localitiesRes.error) {
      console.error("[projects-data] localities failed:", localitiesRes.error.message);
    }
    if (buildersRes.error) {
      console.error("[projects-data] builders failed:", buildersRes.error.message);
    }

    return {
      localities: (localitiesRes.data ?? []) as FilterOption[],
      builders: (buildersRes.data ?? []) as FilterOption[],
    };
  } catch (err) {
    console.error("[projects-data] getFilterOptions threw:", err);
    return { localities: [], builders: [] };
  }
}

function formatPrice(project: {
  price_display: string | null;
  price_type: string | null;
  price_min: number | null;
  price_max: number | null;
  price_unit: string | null;
  price_note: string | null;
}): { priceLine: string; priceSuffix: string | null } {
  if (project.price_display) {
    return { priceLine: project.price_display, priceSuffix: project.price_note };
  }

  if (project.price_min == null) {
    return { priceLine: "Price on request", priceSuffix: null };
  }

  const unit = project.price_unit ? ` ${project.price_unit}` : "";
  const min = `₹${project.price_min}${unit}`;

  // "Fixed Price" projects (typically Plots) show a single figure rather
  // than a min–max range, even if price_max happens to be populated.
  if (
    project.price_type !== "Fixed Price" &&
    project.price_max != null &&
    project.price_max !== project.price_min
  ) {
    return {
      priceLine: min,
      priceSuffix: project.price_note ?? `up to ₹${project.price_max}${unit}`,
    };
  }

  return { priceLine: min, priceSuffix: project.price_note ?? "onwards" };
}

export async function getProjects(
  supabase: SupabaseClient,
  query: ProjectsQuery
): Promise<ProjectsResult> {
  try {
    const from = (query.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let builder: any = supabase
      .from("projects")
      .select(
        "id, name, slug, builder_id, locality_id, property_type, status, is_featured, is_published, price_type, price_min, price_max, price_display, price_unit, price_per_sqft, price_note, sort_order, created_at",
        { count: "exact" }
      );

    if (query.search) {
      builder = builder.ilike("name", `%${query.search}%`);
    }
    if (query.localityId) {
      builder = builder.eq("locality_id", query.localityId);
    }
    if (query.builderId) {
      builder = builder.eq("builder_id", query.builderId);
    }
    if (query.propertyType) {
      builder = builder.eq("property_type", query.propertyType);
    }
    if (query.status) {
      builder = builder.eq("status", query.status);
    }

    builder = builder
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data: projects, error, count } = await builder;

    if (error) {
      console.error("[projects-data] getProjects failed:", error.message);
      return { items: [], totalCount: 0, error: error.message };
    }

    if (!projects || projects.length === 0) {
      return { items: [], totalCount: count ?? 0, error: null };
    }

    const projectIds = projects.map((p: any) => p.id as string);
    const builderIds = Array.from(
      new Set(projects.map((p: any) => p.builder_id).filter(Boolean))
    ) as string[];
    const localityIds = Array.from(
      new Set(projects.map((p: any) => p.locality_id).filter(Boolean))
    ) as string[];

    const [buildersRes, localitiesRes, imagesRes] = await Promise.all([
      builderIds.length
        ? supabase.from("builders").select("id, name").in("id", builderIds)
        : Promise.resolve({ data: [], error: null }),
      localityIds.length
        ? supabase.from("localities").select("id, name").in("id", localityIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("project_images")
        .select("id, project_id, image_url, image_type, sort_order")
        .in("project_id", projectIds),
    ]);

    if (buildersRes.error) {
      console.error("[projects-data] resolving builders failed:", buildersRes.error.message);
    }
    if (localitiesRes.error) {
      console.error("[projects-data] resolving localities failed:", localitiesRes.error.message);
    }
    if ((imagesRes as any).error) {
      console.error(
        "[projects-data] resolving project images failed:",
        (imagesRes as any).error.message
      );
    }

    const builderNameById = new Map(
      (buildersRes.data ?? []).map((b: any) => [b.id as string, b.name as string])
    );
    const localityNameById = new Map(
      (localitiesRes.data ?? []).map((l: any) => [l.id as string, l.name as string])
    );

    const imagesByProject = new Map<string, any[]>();
    for (const img of (imagesRes as any).data ?? []) {
      const list = imagesByProject.get(img.project_id) ?? [];
      list.push(img);
      imagesByProject.set(img.project_id, list);
    }

    const items: ProjectListItem[] = projects.map((p: any) => {
      const images = (imagesByProject.get(p.id) ?? []).sort((a, b) => {
        const aIsHero = (a.image_type ?? "").toLowerCase() === HERO_IMAGE_TYPE;
        const bIsHero = (b.image_type ?? "").toLowerCase() === HERO_IMAGE_TYPE;
        if (aIsHero && !bIsHero) return -1;
        if (!aIsHero && bIsHero) return 1;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });
      const heroImage = images[0]?.image_url ?? null;
      const { priceLine, priceSuffix } = formatPrice(p);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        builderName: p.builder_id ? builderNameById.get(p.builder_id) ?? null : null,
        localityName: p.locality_id ? localityNameById.get(p.locality_id) ?? null : null,
        propertyType: p.property_type,
        status: p.status,
        featured: Boolean(p.is_featured),
        published: Boolean(p.is_published),
        imageUrl: heroImage,
        priceLine,
        priceSuffix,
      };
    });

    return { items, totalCount: count ?? items.length, error: null };
  } catch (err) {
    console.error("[projects-data] getProjects threw:", err);
    return {
      items: [],
      totalCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function deleteProjectById(
  supabase: SupabaseClient,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
