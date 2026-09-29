"use client";

import { useState } from "react";
import Link from "next/link";
import { Contact, Search, AlertTriangle } from "lucide-react";
import type { BuilderListItem } from "@/lib/builders-data";
import BuilderRowActions from "./BuilderRowActions";

const STATUS_STYLES: Record<string, string> = {
  Published: "bg-emerald-50 text-emerald-700",
  Draft: "bg-line/70 text-muted",
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

function BuilderThumbnail({
  imageUrl,
  name,
  size = "table",
}: {
  imageUrl: string | null;
  name: string;
  size?: "table" | "card";
}) {
  // A plain <img> is used deliberately, same as ProjectThumbnail /
  // LocalityThumbnail: image_url can point to any external host, and
  // next/image would throw for a hostname that isn't explicitly
  // allowlisted in next.config.ts. onError falls back to the placeholder
  // icon instead of breaking the row/card.
  const [failed, setFailed] = useState(false);
  const dimensions = size === "table" ? "h-12 w-12" : "h-14 w-14";

  if (imageUrl && !failed) {
    return (
      <div
        className={`relative ${dimensions} shrink-0 overflow-hidden rounded-lg bg-surface`}
      >
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
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-lg bg-surface`}
    >
      <Contact className="h-5 w-5 text-gray-300" />
    </div>
  );
}

interface BuildersTableProps {
  items: BuilderListItem[];
  hasActiveFilters: boolean;
  error?: string | null;
}

export default function BuildersTable({ items, hasActiveFilters, error }: BuildersTableProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm font-medium text-ink">Couldn&apos;t load builders</p>
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
            <Contact className="h-5 w-5 text-muted" />
          )}
        </div>
        {hasActiveFilters ? (
          <p className="text-sm font-medium text-muted">No builders match your filters.</p>
        ) : (
          <>
            <p className="text-sm font-medium text-muted">No builders found</p>
            <Link
              href="/dashboard/builders/new"
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white hover:bg-gold/90"
            >
              + Add Builder
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet: standard table, same structure as the Projects
          and Localities pages. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
              <th className="px-5 py-3 font-bold">Builder</th>
              <th className="px-4 py-3 font-bold">Projects</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map((builder) => (
              <tr key={builder.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <BuilderThumbnail imageUrl={builder.imageUrl} name={builder.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{builder.name}</p>
                      {builder.slug && (
                        <p className="truncate text-xs text-muted">/{builder.slug}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink whitespace-nowrap">{builder.projectCount}</td>
                <td className="px-4 py-3">
                  <PublishedBadge published={builder.published} />
                </td>
                <td className="px-4 py-3 text-right">
                  <BuilderRowActions
                    builderId={builder.id}
                    builderName={builder.name}
                    builderSlug={builder.slug}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: responsive card/list layout, same convention as
          LocalitiesTable. Shows name, project count, status, actions. */}
      <div className="divide-y divide-line sm:hidden">
        {items.map((builder) => (
          <div key={builder.id} className="flex items-start gap-3 px-4 py-4">
            <BuilderThumbnail imageUrl={builder.imageUrl} name={builder.name} size="card" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{builder.name}</p>
                  {builder.slug && (
                    <p className="truncate text-xs text-muted">/{builder.slug}</p>
                  )}
                </div>
                <BuilderRowActions
                  builderId={builder.id}
                  builderName={builder.name}
                  builderSlug={builder.slug}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                <span>{builder.projectCount} projects</span>
              </div>

              <div className="mt-2">
                <PublishedBadge published={builder.published} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
