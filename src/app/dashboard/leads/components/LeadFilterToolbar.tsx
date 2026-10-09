"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, RotateCcw, Search } from "lucide-react";
import GoldSelect from "@/app/dashboard/components/form/GoldSelect";
import { LEAD_STATUSES } from "@/lib/leads-data";

export default function LeadFilterToolbar({
  initialSearch,
  initialStatus,
  view,
}: {
  initialSearch: string;
  initialStatus: string;
  view: "active" | "closed";
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
    router.push(view === "closed" ? `${pathname}?view=closed` : pathname);
  }

  const hasFilters = Boolean(initialSearch || initialStatus);

  function toggleClosedView() {
    const params = new URLSearchParams();
    params.set("view", view === "closed" ? "active" : "closed");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, phone or email..."
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <GoldSelect
          value={initialStatus}
          onChange={(v) => updateParam("status", v)}
          placeholder="All Status"
          options={LEAD_STATUSES.filter((status) => status !== "Closed").map((status) => ({ value: status, label: status }))}
        />

        <button
          type="button"
          onClick={toggleClosedView}
          className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
            view === "closed"
              ? "border-gold bg-gold text-white hover:bg-gold/90"
              : "border-gold text-gold hover:bg-gold-light/30"
          }`}
        >
          <Archive className="h-4 w-4" />
          {view === "closed" ? "Active Leads" : "Closed Leads"}
        </button>

        {hasFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center justify-center gap-1.5 self-center rounded-full border border-gold/40 px-3.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold-light/30 sm:justify-self-start"
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
