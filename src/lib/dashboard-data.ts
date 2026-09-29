import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SCHEMA NOTE
 * ---------------------------------------------------------------------------
 * `projects`, `builders`, `localities` column names below are confirmed
 * against the real Supabase schema (see lib/projects-data.ts for the full
 * confirmed `projects` shape). Relevant here: the publish flag is
 * `is_published`, not `published`.
 *
 *   leads        id, name, project_id (fk -> projects.id),
 *                status ('New' | 'Contacted' | 'Site Visit' | 'Negotiation' | 'Closed' | 'Lost'),
 *                created_at
 *   blog_posts   id, is_published (boolean) — unconfirmed, adjust here if wrong
 *
 * If `leads` or `blog_posts` column names differ, only this file needs
 * updating — every Supabase call here is isolated per function.
 */

export async function getAdminName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("name")
      .eq("user_id", userId)
      .single();

    if (error || !data?.name) {
      return "Admin";
    }

    return data.name as string;
  } catch (err) {
    console.error("[dashboard-data] getAdminName threw:", err);
    return "Admin";
  }
}

export interface KpiCounts {
  projects: number;
  localities: number;
  builders: number;
  leads: number;
}

export interface RecentLead {
  id: string;
  name: string;
  projectName: string | null;
  status: string;
  createdAt: string | null;
}

export interface ProjectOverviewCounts {
  apartments: number;
  plots: number;
  readyToMove: number;
  underConstruction: number;
}

export interface WebsiteOverviewCounts {
  publishedProjects: number;
  draftProjects: number;
  publishedBlogs: number;
  newLeadsToday: number;
}

// The Supabase query builder's generic types make a reusable "add one more
// filter" helper impractical to type precisely; `any` is scoped to this one
// internal helper only.
/* eslint-disable @typescript-eslint/no-explicit-any */
async function safeCount(
  supabase: SupabaseClient,
  table: string,
  build?: (query: any) => any
): Promise<number> {
  try {
    let query: any = supabase.from(table).select("*", { count: "exact", head: true });
    if (build) {
      query = build(query);
    }
    const { count, error } = await query;
    if (error) {
      console.error(`[dashboard-data] count(${table}) failed:`, error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error(`[dashboard-data] count(${table}) threw:`, err);
    return 0;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getKpiCounts(supabase: SupabaseClient): Promise<KpiCounts> {
  const [projects, localities, builders, leads] = await Promise.all([
    safeCount(supabase, "projects"),
    safeCount(supabase, "localities"),
    safeCount(supabase, "builders"),
    safeCount(supabase, "leads"),
  ]);

  return { projects, localities, builders, leads };
}

export async function getProjectOverview(
  supabase: SupabaseClient
): Promise<ProjectOverviewCounts> {
  const [apartments, plots, readyToMove, underConstruction] = await Promise.all([
    safeCount(supabase, "projects", (q) => q.eq("property_type", "Apartment")),
    safeCount(supabase, "projects", (q) => q.eq("property_type", "Plot")),
    safeCount(supabase, "projects", (q) => q.eq("status", "Ready to Move")),
    safeCount(supabase, "projects", (q) => q.eq("status", "Under Construction")),
  ]);

  return { apartments, plots, readyToMove, underConstruction };
}

export async function getWebsiteOverview(
  supabase: SupabaseClient
): Promise<WebsiteOverviewCounts> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [publishedProjects, draftProjects, publishedBlogs, newLeadsToday] =
    await Promise.all([
      safeCount(supabase, "projects", (q) => q.eq("is_published", true)),
      safeCount(supabase, "projects", (q) => q.eq("is_published", false)),
      safeCount(supabase, "blog_posts", (q) => q.eq("is_published", true)),
      safeCount(supabase, "leads", (q) =>
        q.gte("created_at", startOfToday.toISOString())
      ),
    ]);

  return { publishedProjects, draftProjects, publishedBlogs, newLeadsToday };
}

export async function getRecentLeads(
  supabase: SupabaseClient,
  limit = 5
): Promise<RecentLead[]> {
  try {
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, status, created_at, project_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[dashboard-data] getRecentLeads failed:", error.message);
      return [];
    }

    if (!leads || leads.length === 0) {
      return [];
    }

    const projectIds = Array.from(
      new Set(
        leads
          .map((lead) => lead.project_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    let projectNameById = new Map<string, string>();

    if (projectIds.length > 0) {
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);

      if (projectsError) {
        console.error(
          "[dashboard-data] resolving lead project names failed:",
          projectsError.message
        );
      } else if (projects) {
        projectNameById = new Map(projects.map((p) => [p.id as string, p.name as string]));
      }
    }

    return leads.map((lead) => ({
      id: lead.id as string,
      name: lead.name as string,
      projectName: lead.project_id
        ? projectNameById.get(lead.project_id as string) ?? null
        : null,
      status: lead.status as string,
      createdAt: lead.created_at as string | null,
    }));
  } catch (err) {
    console.error("[dashboard-data] getRecentLeads threw:", err);
    return [];
  }
}
