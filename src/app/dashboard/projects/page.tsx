import { Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import {
  getFilterOptions,
  getProjects,
  getProjectSummaryCounts,
  PAGE_SIZE,
} from "@/lib/projects-data";
import DashboardHeader from "../components/DashboardHeader";
import ProjectsSummaryCards from "./components/ProjectsSummaryCards";
import FilterToolbar from "./components/FilterToolbar";
import ProjectsTable from "./components/ProjectsTable";
import PaginationControls from "./components/PaginationControls";
import DeleteSuccessToast from "./components/DeleteSuccessToast";

function firstValue(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

export default async function ProjectsPage({
  searchParams,
}: PageProps<"/dashboard/projects">) {
  const resolvedParams = await searchParams;

  const search = firstValue(resolvedParams.q);
  const localityId = firstValue(resolvedParams.locality);
  const builderId = firstValue(resolvedParams.builder);
  const propertyType = firstValue(resolvedParams.type);
  const status = firstValue(resolvedParams.status);
  const pageParam = Number.parseInt(firstValue(resolvedParams.page), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const supabase = await createClient();

  const [counts, filterOptions, projectsResult] = await Promise.all([
    getProjectSummaryCounts(supabase),
    getFilterOptions(supabase),
    getProjects(supabase, {
      search,
      localityId,
      builderId,
      propertyType,
      status,
      page,
    }),
  ]);

  const hasActiveFilters = Boolean(
    search || localityId || builderId || propertyType || status
  );

  return (
    <>
      <DashboardHeader
        title="Projects"
        subtitle="Manage all property projects displayed on the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
        action={
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Link>
        }
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="space-y-5">
          <ProjectsSummaryCards counts={counts} />

          <FilterToolbar
            localities={filterOptions.localities}
            builders={filterOptions.builders}
            initialSearch={search}
            initialLocalityId={localityId}
            initialBuilderId={builderId}
            initialPropertyType={propertyType}
            initialStatus={status}
          />

          <div className="rounded-2xl border border-line bg-white">
            <ProjectsTable
              items={projectsResult.items}
              hasActiveFilters={hasActiveFilters}
              error={projectsResult.error}
            />
            {!projectsResult.error && projectsResult.items.length > 0 && (
              <PaginationControls
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={projectsResult.totalCount}
              />
            )}
          </div>
        </div>
      </main>

      <DeleteSuccessToast />
    </>
  );
}
