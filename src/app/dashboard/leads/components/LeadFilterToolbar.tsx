"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, RotateCcw, Search } from "lucide-react";
import { LEAD_STATUSES } from "@/lib/leads-data";

export default function LeadFilterToolbar({
  initialSearch,
  initialStatus,
}: {
  initialSearch: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    const timeout = window.setTimeout(() => updateParam("q", searchInput), 400);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function resetFilters() {
    setSearchInput("");
    router.push(pathname);
  }

  const hasFilters = Boolean(initialSearch || initialStatus);

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search leads or projects..."
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <div className="relative">
          <select
            value={initialStatus}
            onChange={(event) => updateParam("status", event.target.value)}
            className="w-full appearance-none rounded-lg border border-line bg-surface py-2.5 pl-3 pr-8 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-300"
          >
            <option value="">All Status</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-line text-sm font-semibold text-gold hover:bg-surface sm:justify-start sm:border-0 sm:p-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        ) : (
          <div className="hidden lg:block" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
