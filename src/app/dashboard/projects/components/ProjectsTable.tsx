"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Star, Search, AlertTriangle } from "lucide-react";
import type { ProjectListItem } from "@/lib/projects-data";
import ProjectRowActions from "./ProjectRowActions";

const STATUS_STYLES: Record<string, string> = {
  Published: "bg-emerald-50 text-emerald-700",
  Draft: "bg-line/70 text-muted",
};

const PROPERTY_TYPE_STYLES: Record<string, string> = {
  Apartment: "bg-gold-light/50 text-navy",
  Plot: "bg-navy/10 text-navy",
};

function PublishedBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
        published ? STATUS_STYLES.Published : STATUS_STYLES.Draft
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-gray-400"}`}
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}

function PropertyTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted">—</span>;
  const style = PROPERTY_TYPE_STYLES[type] ?? "bg-line/70 text-ink";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${style}`}
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
      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface">
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
    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-surface">
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
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
            <th className="px-5 py-3 font-bold">Project</th>
            <th className="px-4 py-3 font-bold">Builder</th>
            <th className="px-4 py-3 font-bold">Locality</th>
            <th className="px-4 py-3 font-bold">Property Type</th>
            <th className="px-4 py-3 font-bold">Price</th>
            <th className="px-4 py-3 font-bold">Status</th>
            <th className="px-4 py-3 font-bold">Featured</th>
            <th className="px-4 py-3 text-right font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {items.map((project) => (
            <tr key={project.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <ProjectThumbnail imageUrl={project.imageUrl} name={project.name} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{project.name}</p>
                    {project.builderName && (
                      <p className="truncate text-xs text-muted">{project.builderName}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-ink whitespace-nowrap">
                {project.builderName ?? "—"}
              </td>
              <td className="px-4 py-3 text-ink whitespace-nowrap">
                {project.localityName ?? "—"}
              </td>
              <td className="px-4 py-3">
                <PropertyTypeBadge type={project.propertyType} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <p className="font-semibold text-ink">{project.priceLine}</p>
                {project.priceSuffix && (
                  <p className="text-xs text-muted">{project.priceSuffix}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <PublishedBadge published={project.published} />
              </td>
              <td className="px-4 py-3">
                {project.featured ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
                    <Star className="h-3.5 w-3.5 fill-gold" />
                    Featured
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
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
