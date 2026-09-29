"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
}

export default function PaginationControls({ page, pageSize, totalCount }: PaginationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  function goToPage(target: number) {
    if (target < 1 || target > totalPages || target === page) return;
    const params = new URLSearchParams(searchParams.toString());
    if (target === 1) {
      params.delete("page");
    } else {
      params.set("page", String(target));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const pageNumbers = buildPageList(page, totalPages);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-4 sm:flex-row sm:px-5">
      <p className="text-xs text-muted sm:text-sm">
        Showing {from}–{to} of {totalCount} projects
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="flex h-8 items-center gap-1 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </button>

        {pageNumbers.map((p, idx) =>
          p === "…" ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goToPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                p === page ? "bg-gold text-white" : "border border-line text-ink hover:bg-surface"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 items-center gap-1 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) {
      result.push("…");
    }
    result.push(p);
    prev = p;
  }
  return result;
}
