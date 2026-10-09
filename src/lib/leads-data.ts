import type { SupabaseClient } from "@supabase/supabase-js";
/* eslint-disable @typescript-eslint/no-explicit-any */

export const LEADS_PAGE_SIZE = 10;
export const LEAD_STATUSES = ["New", "Contacted", "Follow-up", "Closed"] as const;

export interface LeadListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  preferredContact: string | null;
  message: string | null;
  projectId: string | null;
  projectName: string | null;
  builderId: string | null;
  builderName: string | null;
  localityId: string | null;
  localityName: string | null;
  propertyType: string | null;
  bhk: string | null;
  budget: string | null;
  source: string;
  status: string;
  notes: string | null;
  nextFollowUpDate: string | null;
  nextFollowUpTime: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface LeadSummaryCounts { all: number; newLeads: number; followUps: number; closed: number; }
export interface LeadsQuery { search?: string; status?: string; page: number; view?: "active" | "closed"; }
export interface LeadsResult { items: LeadListItem[]; totalCount: number; error: string | null; }

async function safeCount(supabase: SupabaseClient, build?: (query: any) => any): Promise<number> {
  try {
    let query: any = supabase.from("leads").select("*", { count: "exact", head: true });
    if (build) query = build(query);
    const { count, error } = await query;
    if (error) { console.error("[leads-data] count failed:", error.message); return 0; }
    return count ?? 0;
  } catch (error) { console.error("[leads-data] count threw:", error); return 0; }
}

export async function getLeadSummaryCounts(supabase: SupabaseClient): Promise<LeadSummaryCounts> {
  const [all, newLeads, followUps, closed] = await Promise.all([
    safeCount(supabase),
    safeCount(supabase, q => q.eq("status", "New")),
    safeCount(supabase, q => q.eq("status", "Follow-up")),
    safeCount(supabase, q => q.eq("status", "Closed")),
  ]);
  return { all, newLeads, followUps, closed };
}

export async function getLeads(supabase: SupabaseClient, query: LeadsQuery): Promise<LeadsResult> {
  try {
    const from = (query.page - 1) * LEADS_PAGE_SIZE;
    const to = from + LEADS_PAGE_SIZE - 1;
    let builder: any = supabase.from("leads").select(`id,name,phone,email,whatsapp,preferred_contact,message,project_id,builder_id,locality_id,property_type,bhk,budget,source,status,notes,next_follow_up_date,next_follow_up_time,created_at,updated_at`, { count: "exact" });

    if (query.search) {
      // Commas/parens would break the PostgREST or() filter; escape LIKE wildcards.
      const term = query.search.trim().replace(/[,()]/g, " ").replace(/[%_\\]/g, "\\$&");
      builder = builder.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
    }
    // The Leads page has two separate views: active leads and closed leads.
    // Never mix Closed records into the active list.
    if (query.view === "closed") {
      builder = builder.eq("status", "Closed");
    } else if (query.status && query.status !== "Closed" && LEAD_STATUSES.includes(query.status as (typeof LEAD_STATUSES)[number])) {
      builder = builder.eq("status", query.status);
    } else {
      builder = builder.neq("status", "Closed");
    }
    builder = builder.order("created_at", { ascending: false }).range(from, to);

    const { data: leads, error, count } = await builder;
    if (error) return { items: [], totalCount: 0, error: error.message };

    const rows = (leads ?? []) as any[];
    const projectIds = Array.from(new Set(rows.map(r => r.project_id).filter(Boolean)));
    const builderIds = Array.from(new Set(rows.map(r => r.builder_id).filter(Boolean)));
    const localityIds = Array.from(new Set(rows.map(r => r.locality_id).filter(Boolean)));

    const [projects, builders, localities] = await Promise.all([
      projectIds.length ? supabase.from("projects").select("id,name").in("id", projectIds) : Promise.resolve({ data: [], error: null }),
      builderIds.length ? supabase.from("builders").select("id,name").in("id", builderIds) : Promise.resolve({ data: [], error: null }),
      localityIds.length ? supabase.from("localities").select("id,name").in("id", localityIds) : Promise.resolve({ data: [], error: null }),
    ]);
    const map = <T extends { id: string; name: string }>(rows: T[] | null) => new Map((rows ?? []).map(r => [r.id, r.name]));
    const projectMap = map(projects.data as any[]);
    const builderMap = map(builders.data as any[]);
    const localityMap = map(localities.data as any[]);

    const items: LeadListItem[] = rows.map(row => ({
      id: row.id, name: row.name ?? "", phone: row.phone ?? "", email: row.email ?? null,
      whatsapp: row.whatsapp ?? null, preferredContact: row.preferred_contact ?? null, message: row.message ?? null,
      projectId: row.project_id ?? null, projectName: row.project_id ? projectMap.get(row.project_id) ?? null : null,
      builderId: row.builder_id ?? null, builderName: row.builder_id ? builderMap.get(row.builder_id) ?? null : null,
      localityId: row.locality_id ?? null, localityName: row.locality_id ? localityMap.get(row.locality_id) ?? null : null,
      propertyType: row.property_type ?? null, bhk: row.bhk ?? null, budget: row.budget ?? null,
      source: row.source ?? "Website", status: row.status ?? "New", notes: row.notes ?? null,
      nextFollowUpDate: row.next_follow_up_date ?? null, nextFollowUpTime: row.next_follow_up_time ?? null,
      createdAt: row.created_at ?? null, updatedAt: row.updated_at ?? null,
    }));
    return { items, totalCount: count ?? items.length, error: null };
  } catch (error) {
    console.error("[leads-data] getLeads threw:", error);
    return { items: [], totalCount: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
