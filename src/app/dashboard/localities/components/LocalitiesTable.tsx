"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Search, AlertTriangle } from "lucide-react";
import type { LocalityListItem } from "@/lib/localities-data";
import LocalityRowActions from "./LocalityRowActions";

const STATUS_STYLES: Record<string, string> = {
  Published: "border border-gold/25 bg-gold-light/25 text-navy",
  Draft: "border border-line bg-surface text-muted",
};

function PublishedBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
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

function LocalityThumbnail({
  imageUrl,
  name,
  size = "table",
}: {
  imageUrl: string | null;
  name: string;
  size?: "table" | "card";
}) {
  // A plain <img> is used deliberately, same as ProjectThumbnail in the
  // Projects page: image_url can point to any external host, and
  // next/image would throw for a hostname that isn't explicitly
  // allowlisted in next.config.ts. onError falls back to the placeholder
  // icon instead of breaking the row/card.
  const [failed, setFailed] = useState(false);
  const dimensions = size === "table" ? "h-10 w-14" : "h-14 w-14";

  if (imageUrl && !failed) {
    return (
      <div className={`relative ${dimensions} shrink-0 overflow-hidden rounded-lg bg-surface`}>
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
      <MapPin className="h-5 w-5 text-gray-300" />
    </div>
  );
}

interface LocalitiesTableProps {
  items: LocalityListItem[];
  hasActiveFilters: boolean;
  error?: string | null;
}

export default function LocalitiesTable({ items, hasActiveFilters, error }: LocalitiesTableProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm font-medium text-ink">Couldn&apos;t load localities</p>
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
            <MapPin className="h-5 w-5 text-muted" />
          )}
        </div>
        {hasActiveFilters ? (
          <p className="text-sm font-medium text-muted">No localities match your filters.</p>
        ) : (
          <>
            <p className="text-sm font-medium text-muted">No localities found</p>
            <Link
              href="/dashboard/localities/new"
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white hover:bg-gold/90"
            >
              + Add Locality
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet: standard table, same structure as the Projects
          page. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
              <th className="w-[42%] px-4 py-3 font-bold">Locality</th>
              <th className="w-[18%] px-4 py-3 font-bold">City</th>
              <th className="w-[15%] px-4 py-3 font-bold">Projects</th>
              <th className="w-[15%] px-4 py-3 font-bold">Status</th>
              <th className="w-[10%] px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map((locality) => (
              <tr key={locality.id} className="border-b border-line transition-colors last:border-0 hover:bg-surface/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <LocalityThumbnail imageUrl={locality.imageUrl} name={locality.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{locality.name}</p>
                      {locality.slug && (
                        <p className="truncate text-xs text-muted">/{locality.slug}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-ink whitespace-nowrap">{locality.city ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink whitespace-nowrap">{locality.projectCount}</td>
                <td className="px-4 py-2.5">
                  <PublishedBadge published={locality.published} />
                </td>
                <td className="px-4 py-3 text-right">
                  <LocalityRowActions
                    localityId={locality.id}
                    localityName={locality.name}
                    localitySlug={locality.slug}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: responsive card/list layout — the Projects page table
          doesn't have this (it just scrolls horizontally on mobile), but
          it's an explicit requirement for this page. Shows the same
          fields the desktop table does: name, city, project count,
          status, actions. */}
      <div className="divide-y divide-line sm:hidden">
        {items.map((locality) => (
          <div key={locality.id} className="flex items-start gap-3 px-4 py-4">
            <LocalityThumbnail imageUrl={locality.imageUrl} name={locality.name} size="card" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{locality.name}</p>
                  {locality.slug && (
                    <p className="truncate text-xs text-muted">/{locality.slug}</p>
                  )}
                </div>
                <LocalityRowActions
                  localityId={locality.id}
                  localityName={locality.name}
                  localitySlug={locality.slug}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                <span>{locality.city ?? "—"}</span>
                <span>{locality.projectCount} projects</span>
              </div>

              <div className="mt-2">
                <PublishedBadge published={locality.published} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
