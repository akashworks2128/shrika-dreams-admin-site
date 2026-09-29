import { Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import {
  getCityFilterOptions,
  getLocalities,
  getLocalitySummaryCounts,
  PAGE_SIZE,
} from "@/lib/localities-data";
import DashboardHeader from "../components/DashboardHeader";
import LocalitiesSummaryCards from "./components/LocalitiesSummaryCards";
import LocalityFilterToolbar from "./components/LocalityFilterToolbar";
import LocalitiesTable from "./components/LocalitiesTable";
import LocalityPaginationControls from "./components/LocalityPaginationControls";
import DeleteSuccessToast from "../projects/components/DeleteSuccessToast";

function firstValue(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

export default async function LocalitiesPage({
  searchParams,
}: PageProps<"/dashboard/localities">) {
  const resolvedParams = await searchParams;

  const search = firstValue(resolvedParams.q);
  const city = firstValue(resolvedParams.city);
  const status = firstValue(resolvedParams.status);
  const pageParam = Number.parseInt(firstValue(resolvedParams.page), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const supabase = await createClient();

  const [counts, cities, localitiesResult] = await Promise.all([
    getLocalitySummaryCounts(supabase),
    getCityFilterOptions(supabase),
    getLocalities(supabase, { search, city, status, page }),
  ]);

  const hasActiveFilters = Boolean(search || city || status);

  return (
    <>
      <DashboardHeader
        title="Localities"
        subtitle="Manage all property localities displayed on the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
        action={
          <Link
            href="/dashboard/localities/new"
            className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90"
          >
            <Plus className="h-4 w-4" />
            Add Locality
          </Link>
        }
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="space-y-5">
          <LocalitiesSummaryCards counts={counts} />

          <LocalityFilterToolbar
            cities={cities}
            initialSearch={search}
            initialCity={city}
            initialStatus={status}
          />

          <div className="rounded-2xl border border-line bg-white">
            <LocalitiesTable
              items={localitiesResult.items}
              hasActiveFilters={hasActiveFilters}
              error={localitiesResult.error}
            />
            {!localitiesResult.error && localitiesResult.items.length > 0 && (
              <LocalityPaginationControls
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={localitiesResult.totalCount}
              />
            )}
          </div>
        </div>
      </main>

      <DeleteSuccessToast />
    </>
  );
}
