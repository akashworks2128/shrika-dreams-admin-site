"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, RotateCcw, ChevronDown } from "lucide-react";
import type { FilterOption } from "@/lib/projects-data";

const PROPERTY_TYPES = ["Apartment", "Plot"] as const;
const STATUSES = ["Ready to Move", "Under Construction", "New Launch"] as const;

interface FilterToolbarProps {
  localities: FilterOption[];
  builders: FilterOption[];
  initialSearch: string;
  initialLocalityId: string;
  initialBuilderId: string;
  initialPropertyType: string;
  initialStatus: string;
}

export default function FilterToolbar({
  localities,
  builders,
  initialSearch,
  initialLocalityId,
  initialBuilderId,
  initialPropertyType,
  initialStatus,
}: FilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(initialSearch);
  const isFirstRun = useRef(true);

  // Debounce the search box before it hits the URL / server query.
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

  function toggleSingleValue(key: string, value: string, currentValue: string) {
    updateParam(key, currentValue === value ? "" : value);
  }

  function resetFilters() {
    setSearchInput("");
    router.push(pathname);
  }

  const hasActiveFilters =
    Boolean(initialSearch) ||
    Boolean(initialLocalityId) ||
    Boolean(initialBuilderId) ||
    Boolean(initialPropertyType) ||
    Boolean(initialStatus);

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300"
          />
        </div>

        <FilterSelect
          value={initialLocalityId}
          onChange={(v) => updateParam("locality", v)}
          placeholder="All Localities"
          options={localities.map((l) => ({ value: l.id, label: l.name }))}
        />

        <FilterSelect
          value={initialBuilderId}
          onChange={(v) => updateParam("builder", v)}
          placeholder="All Builders"
          options={builders.map((b) => ({ value: b.id, label: b.name }))}
        />

        <FilterSelect
          value={initialPropertyType}
          onChange={(v) => updateParam("type", v)}
          placeholder="All Property Types"
          options={PROPERTY_TYPES.map((t) => ({ value: t, label: t }))}
        />

        <FilterSelect
          value={initialStatus}
          onChange={(v) => updateParam("status", v)}
          placeholder="All Status"
          options={STATUSES.map((s) => ({ value: s, label: s }))}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted">Property Type:</span>
            {PROPERTY_TYPES.map((type) => (
              <CheckboxPill
                key={type}
                label={type}
                checked={initialPropertyType === type}
                onChange={() => toggleSingleValue("type", type, initialPropertyType)}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted">Status:</span>
            {STATUSES.map((status) => (
              <CheckboxPill
                key={status}
                label={status}
                checked={initialStatus === status}
                onChange={() => toggleSingleValue("status", status, initialStatus)}
              />
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
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

function CheckboxPill({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 rounded border-line text-gold focus:ring-amber-300 accent-[#c9a24d]"
      />
      {label}
    </label>
  );
}
