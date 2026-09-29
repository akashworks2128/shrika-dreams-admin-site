"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function LeadPaginationControls({
  page,
  pageSize,
  totalCount,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  function goToPage(target: number) {
    if (target < 1 || target > totalPages || target === page) return;
    const params = new URLSearchParams(searchParams.toString());
    if (target === 1) params.delete("page");
    else params.set("page", String(target));
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const pages = buildPageList(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-4 sm:flex-row sm:px-5">
      <p className="text-xs text-muted sm:text-sm">Showing {from}–{to} of {totalCount} leads</p>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} className="flex h-8 items-center gap-1 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </button>
        {pages.map((item, index) => item === "…" ? (
          <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-muted">…</span>
        ) : (
          <button key={item} type="button" onClick={() => goToPage(item)} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${item === page ? "bg-gold text-white" : "border border-line text-ink hover:bg-surface"}`}>
            {item}
          </button>
        ))}
        <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="flex h-8 items-center gap-1 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40">
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const values = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...values].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push("…");
    result.push(value);
    previous = value;
  }
  return result;
}
