import { Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import { getBuilders, getBuilderSummaryCounts, PAGE_SIZE } from "@/lib/builders-data";
import DashboardHeader from "../components/DashboardHeader";
import BuildersSummaryCards from "./components/BuildersSummaryCards";
import BuilderFilterToolbar from "./components/BuilderFilterToolbar";
import BuildersTable from "./components/BuildersTable";
import BuilderPaginationControls from "./components/BuilderPaginationControls";
import DeleteSuccessToast from "../projects/components/DeleteSuccessToast";

function firstValue(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

export default async function BuildersPage({ searchParams }: PageProps<"/dashboard/builders">) {
  const resolvedParams = await searchParams;

  const search = firstValue(resolvedParams.q);
  const status = firstValue(resolvedParams.status);
  const pageParam = Number.parseInt(firstValue(resolvedParams.page), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const supabase = await createClient();

  const [counts, buildersResult] = await Promise.all([
    getBuilderSummaryCounts(supabase),
    getBuilders(supabase, { search, status, page }),
  ]);

  const hasActiveFilters = Boolean(search || status);

  return (
    <>
      <DashboardHeader
        title="Builders"
        subtitle="Manage all property builders displayed on the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
        action={
          <Link
            href="/dashboard/builders/new"
            className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90"
          >
            <Plus className="h-4 w-4" />
            Add Builder
          </Link>
        }
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="space-y-5">
          <BuildersSummaryCards counts={counts} />

          <BuilderFilterToolbar initialSearch={search} initialStatus={status} />

          <div className="rounded-2xl border border-line bg-white">
            <BuildersTable
              items={buildersResult.items}
              hasActiveFilters={hasActiveFilters}
              error={buildersResult.error}
            />
            {!buildersResult.error && buildersResult.items.length > 0 && (
              <BuilderPaginationControls
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={buildersResult.totalCount}
              />
            )}
          </div>
        </div>
      </main>

      <DeleteSuccessToast />
    </>
  );
}
