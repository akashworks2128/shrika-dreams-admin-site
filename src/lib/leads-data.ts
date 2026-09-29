import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const LEADS_PAGE_SIZE = 10;

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Site Visit",
  "Negotiation",
  "Closed",
  "Lost",
] as const;

export interface LeadListItem {
  id: string;
  name: string;
  projectId: string | null;
  projectName: string | null;
  status: string;
  createdAt: string | null;
}

export interface LeadSummaryCounts {
  all: number;
  newLeads: number;
  siteVisits: number;
  closed: number;
}

export interface LeadsQuery {
  search?: string;
  status?: string;
  page: number;
}

export interface LeadsResult {
  items: LeadListItem[];
  totalCount: number;
  error: string | null;
}

async function safeCount(
  supabase: SupabaseClient,
  build?: (query: any) => any
): Promise<number> {
  try {
    let query: any = supabase.from("leads").select("*", { count: "exact", head: true });
    if (build) query = build(query);
    const { count, error } = await query;
    if (error) {
      console.error("[leads-data] count failed:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error("[leads-data] count threw:", error);
    return 0;
  }
}

export async function getLeadSummaryCounts(
  supabase: SupabaseClient
): Promise<LeadSummaryCounts> {
  const [all, newLeads, siteVisits, closed] = await Promise.all([
    safeCount(supabase),
    safeCount(supabase, (q) => q.eq("status", "New")),
    safeCount(supabase, (q) => q.eq("status", "Site Visit")),
    safeCount(supabase, (q) => q.eq("status", "Closed")),
  ]);

  return { all, newLeads, siteVisits, closed };
}

export async function getLeads(
  supabase: SupabaseClient,
  query: LeadsQuery
): Promise<LeadsResult> {
  try {
    const from = (query.page - 1) * LEADS_PAGE_SIZE;
    const to = from + LEADS_PAGE_SIZE - 1;

    let projectIdsForSearch: string[] | null = null;

    if (query.search) {
      const term = query.search.trim().replace(/[%_,]/g, "\\$&");
      const { data: matchingProjects, error: projectSearchError } = await supabase
        .from("projects")
        .select("id")
        .ilike("name", `%${term}%`);

      if (projectSearchError) {
        console.error("[leads-data] project search failed:", projectSearchError.message);
      } else {
        projectIdsForSearch = (matchingProjects ?? []).map((project) => project.id as string);
      }
    }

    let builder: any = supabase
      .from("leads")
      .select("id, name, project_id, status, created_at", { count: "exact" });

    if (query.search) {
      const term = query.search.trim().replace(/[%_,]/g, "\\$&");
      const nameFilter = `name.ilike.%${term}%`;

      if (projectIdsForSearch && projectIdsForSearch.length > 0) {
        builder = builder.or(`${nameFilter},project_id.in.(${projectIdsForSearch.join(",")})`);
      } else {
        builder = builder.ilike("name", `%${term}%`);
      }
    }

    if (query.status && LEAD_STATUSES.includes(query.status as (typeof LEAD_STATUSES)[number])) {
      builder = builder.eq("status", query.status);
    }

    builder = builder.order("created_at", { ascending: false }).range(from, to);

    const { data: leads, error, count } = await builder;

    if (error) {
      console.error("[leads-data] getLeads failed:", error.message);
      return { items: [], totalCount: 0, error: error.message };
    }

    const rows = (leads ?? []) as Array<{
      id: string;
      name: string;
      project_id: string | null;
      status: string;
      created_at: string | null;
    }>;

    const projectIds = Array.from(
      new Set(rows.map((lead) => lead.project_id).filter((id): id is string => Boolean(id)))
    );

    const projectNameById = new Map<string, string>();

    if (projectIds.length > 0) {
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);

      if (projectsError) {
        console.error("[leads-data] resolving project names failed:", projectsError.message);
      } else {
        for (const project of projects ?? []) {
          projectNameById.set(project.id as string, project.name as string);
        }
      }
    }

    const items: LeadListItem[] = rows.map((lead) => ({
      id: lead.id,
      name: lead.name,
      projectId: lead.project_id,
      projectName: lead.project_id ? projectNameById.get(lead.project_id) ?? null : null,
      status: lead.status,
      createdAt: lead.created_at,
    }));

    return { items, totalCount: count ?? items.length, error: null };
  } catch (error) {
    console.error("[leads-data] getLeads threw:", error);
    return {
      items: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
