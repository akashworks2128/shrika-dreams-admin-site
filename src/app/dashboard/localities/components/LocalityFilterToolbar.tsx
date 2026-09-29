"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, RotateCcw, ChevronDown } from "lucide-react";
import type { CityFilterOption } from "@/lib/localities-data";

const STATUSES = ["Published", "Draft"] as const;

interface LocalityFilterToolbarProps {
  cities: CityFilterOption[];
  initialSearch: string;
  initialCity: string;
  initialStatus: string;
}

export default function LocalityFilterToolbar({
  cities,
  initialSearch,
  initialCity,
  initialStatus,
}: LocalityFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const isFirstRun = useRef(true);

  // Debounce the search box before it hits the URL / server query, same
  // as the Projects page's filter toolbar.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      updateParam("q", searchInput);
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Any filter change resets pagination back to page 1.
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function resetFilters() {
    setSearchInput("");
    router.push(pathname);
  }

  const hasActiveFilters =
    Boolean(initialSearch) || Boolean(initialCity) || Boolean(initialStatus);

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search localities..."
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <FilterSelect
          value={initialCity}
          onChange={(v) => updateParam("city", v)}
          placeholder="All Cities"
          options={cities.map((c) => ({ value: c.city, label: c.city }))}
        />

        <FilterSelect
          value={initialStatus}
          onChange={(v) => updateParam("status", v)}
          placeholder="All Status"
          options={STATUSES.map((s) => ({ value: s, label: s }))}
        />

        {hasActiveFilters ? (
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-line bg-surface py-2.5 pl-3 pr-8 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-300"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
