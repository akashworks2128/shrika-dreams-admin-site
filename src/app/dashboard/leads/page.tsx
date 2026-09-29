import { createClient } from "@/lib/supabase-server";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import { getLeadSummaryCounts, getLeads, LEADS_PAGE_SIZE } from "@/lib/leads-data";
import DashboardHeader from "../components/DashboardHeader";
import LeadsSummaryCards from "./components/LeadsSummaryCards";
import LeadFilterToolbar from "./components/LeadFilterToolbar";
import LeadsTable from "./components/LeadsTable";
import LeadPaginationControls from "./components/LeadPaginationControls";

function firstValue(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export default async function LeadsPage({ searchParams }: PageProps<"/dashboard/leads">) {
  const resolvedParams = await searchParams;
  const search = firstValue(resolvedParams.q);
  const status = firstValue(resolvedParams.status);
  const pageParam = Number.parseInt(firstValue(resolvedParams.page), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const supabase = await createClient();

  const [counts, leadsResult] = await Promise.all([
    getLeadSummaryCounts(supabase),
    getLeads(supabase, { search, status, page }),
  ]);

  return (
    <>
      <DashboardHeader
        title="Leads"
        subtitle="Manage enquiries and potential customers received through the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="space-y-5">
          <LeadsSummaryCards counts={counts} />
          <LeadFilterToolbar initialSearch={search} initialStatus={status} />

          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <LeadsTable
              items={leadsResult.items}
              hasActiveFilters={Boolean(search || status)}
              error={leadsResult.error}
            />
            {!leadsResult.error && leadsResult.items.length > 0 && (
              <LeadPaginationControls
                page={page}
                pageSize={LEADS_PAGE_SIZE}
                totalCount={leadsResult.totalCount}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
