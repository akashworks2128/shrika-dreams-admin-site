"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Star, Search, AlertTriangle } from "lucide-react";
import type { ProjectListItem } from "@/lib/projects-data";
import ProjectRowActions from "./ProjectRowActions";

const STATUS_STYLES: Record<string, string> = {
  Published: "border border-gold/25 bg-gold-light/25 text-navy",
  Draft: "border border-line bg-surface text-muted",
};

const PROPERTY_TYPE_STYLES: Record<string, string> = {
  Apartment: "border border-gold/30 bg-gold-light/35 text-navy",
  Plot: "border border-navy/15 bg-navy/5 text-navy",
};

function PublishedBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
        published ? STATUS_STYLES.Published : STATUS_STYLES.Draft
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${published ? "bg-gold" : "bg-gray-400"}`}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}

function PropertyTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted">—</span>;
  const style = PROPERTY_TYPE_STYLES[type] ?? "border border-line bg-surface text-ink";
  return (
    <span
      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap ${style}`}
    >
      {type}
    </span>
  );
}

function ProjectThumbnail({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  // A plain <img> is used deliberately: image_url can point to any external
  // host, and next/image would throw for a hostname that isn't explicitly
  // allowlisted in next.config.ts. onError falls back to the placeholder
  // icon instead of breaking the row.
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-surface">
      <Building2 className="h-5 w-5 text-gray-300" />
    </div>
  );
}

interface ProjectsTableProps {
  items: ProjectListItem[];
  hasActiveFilters: boolean;
  error?: string | null;
}

export default function ProjectsTable({ items, hasActiveFilters, error }: ProjectsTableProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm font-medium text-ink">Couldn&apos;t load projects</p>
        <p className="max-w-sm text-xs text-muted">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface">
          {hasActiveFilters ? (
            <Search className="h-5 w-5 text-muted" />
          ) : (
            <Building2 className="h-5 w-5 text-muted" />
          )}
        </div>
        {hasActiveFilters ? (
          <p className="text-sm font-medium text-muted">No projects match your filters.</p>
        ) : (
          <>
            <p className="text-sm font-medium text-muted">No projects found</p>
            <Link
              href="/dashboard/projects/new"
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white hover:bg-gold/90"
            >
              + Add Project
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[855px] table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[300px]" />
          <col className="hidden w-[130px] xl:table-column" />
          <col className="hidden w-[130px] lg:table-column" />
          <col className="w-[105px]" />
          <col className="w-[140px]" />
          <col className="w-[110px]" />
          <col className="w-[80px]" />
          <col className="w-[120px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            <th className="px-4 py-3 font-bold">Project</th>
            <th className="hidden px-3 py-3 font-bold xl:table-cell">Builder</th>
            <th className="hidden px-3 py-3 font-bold lg:table-cell">Locality</th>
            <th className="px-3 py-3 font-bold">Type</th>
            <th className="px-3 py-3 font-bold">Price</th>
            <th className="px-3 py-3 font-bold">Status</th>
            <th className="px-3 py-3 text-center font-bold">Featured</th>
            <th className="px-4 py-3 text-right font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {items.map((project) => (
            <tr
              key={project.id}
              className="border-b border-line transition-colors last:border-0 hover:bg-surface/60"
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <ProjectThumbnail imageUrl={project.imageUrl} name={project.name} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink" title={project.name}>
                      {project.name}
                    </p>
                    {/* Below xl the Builder column is hidden, so show it here. */}
                    {project.builderName && (
                      <p className="truncate text-xs text-muted xl:hidden">
                        {project.builderName}
                      </p>
                    )}
                    {project.localityName && (
                      <p className="truncate text-xs text-muted lg:hidden">
                        {project.localityName}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td
                className="hidden truncate px-3 py-2.5 text-ink xl:table-cell"
                title={project.builderName ?? undefined}
              >
                {project.builderName ?? "—"}
              </td>
              <td
                className="hidden truncate px-3 py-2.5 text-ink lg:table-cell"
                title={project.localityName ?? undefined}
              >
                {project.localityName ?? "—"}
              </td>
              <td className="px-3 py-2.5">
                <PropertyTypeBadge type={project.propertyType} />
              </td>
              <td className="px-2.5 py-2.5">
                <p className="truncate text-[12px] font-semibold text-ink" title={project.priceLine}>
                  {project.priceLine}
                </p>
                {project.priceSuffix && (
                  <p className="truncate text-[10px] text-muted" title={project.priceSuffix}>
                    {project.priceSuffix}
                  </p>
                )}
              </td>
              <td className="px-3 py-2.5">
                <PublishedBadge published={project.published} />
              </td>
              <td className="px-3 py-2.5 text-center">
                {project.featured ? (
                  <span title="Featured" className="inline-flex">
                    <Star className="h-4 w-4 fill-gold text-gold" aria-label="Featured" />
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">
                <ProjectRowActions
                  projectId={project.id}
                  projectName={project.name}
                  projectSlug={project.slug}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
