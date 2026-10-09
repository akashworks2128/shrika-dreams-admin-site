import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import { getLeadSummaryCounts, getLeads, LEADS_PAGE_SIZE } from "@/lib/leads-data";
import DashboardHeader from "../components/DashboardHeader";
import LeadsSummaryCards from "./components/LeadsSummaryCards";
import LeadFilterToolbar from "./components/LeadFilterToolbar";
import LeadsTable from "./components/LeadsTable";
import LeadPaginationControls from "./components/LeadPaginationControls";
import LeadExportButton from "./components/LeadExportButton";

function firstValue(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export default async function LeadsPage({ searchParams }: PageProps<"/dashboard/leads">) {
  const resolvedParams = await searchParams;
  const search = firstValue(resolvedParams.q);
  const requestedStatus = firstValue(resolvedParams.status);
  const requestedView = firstValue(resolvedParams.view);
  const view: "active" | "closed" = requestedView === "closed" ? "closed" : "active";
  // Closed is a dedicated view, not an active status filter.
  const status = view === "closed" ? "" : requestedStatus === "Closed" ? "" : requestedStatus;
  const pageParam = Number.parseInt(firstValue(resolvedParams.page), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const useDevAdminClient = process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";
  let supabase;
  try {
    supabase = useDevAdminClient ? createAdminClient() : await createClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initialize the admin database client.";
    return (
      <>
        <DashboardHeader
          title="Leads"
          subtitle="Manage enquiries and potential customers received through the Shrika Dreams website."
          adminName={ADMIN_DISPLAY_NAME}
          action={<LeadExportButton />}
        />
        <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-semibold">Unable to connect to the Leads database.</p>
            <p className="mt-1">{message}</p>
          </div>
        </main>
      </>
    );
  }

  const [counts, leadsResult] = await Promise.all([
    getLeadSummaryCounts(supabase),
    getLeads(supabase, { search, status, page, view }),
  ]);

  return (
    <>
      <DashboardHeader
        title="Leads"
        subtitle="Manage enquiries and potential customers received through the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
        action={<LeadExportButton />}
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="space-y-5">
          <LeadsSummaryCards counts={counts} />
          <LeadFilterToolbar initialSearch={search} initialStatus={status} view={view} />

          {view === "closed" && (
            <div>
              <h2 className="text-lg font-bold text-ink">Closed Leads</h2>
              <p className="mt-1 text-sm text-muted">Leads marked as Closed are kept here for reference.</p>
            </div>
          )}

          {view === "active" && (
            <div>
              <h2 className="text-lg font-bold text-ink">Active Leads</h2>
              <p className="mt-1 text-sm text-muted">New, contacted and follow-up enquiries.</p>
            </div>
          )}

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
