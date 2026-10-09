"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, Search, RotateCcw } from "lucide-react";
import GoldSelect from "@/app/dashboard/components/form/GoldSelect";
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
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300"
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

      <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-10">
          <ChipGroup label="Property Type">
            {PROPERTY_TYPES.map((type) => (
              <FilterChip
                key={type}
                label={type}
                selected={initialPropertyType === type}
                onClick={() => toggleSingleValue("type", type, initialPropertyType)}
              />
            ))}
          </ChipGroup>

          <ChipGroup label="Status">
            {STATUSES.map((status) => (
              <FilterChip
                key={status}
                label={status}
                selected={initialStatus === status}
                onClick={() => toggleSingleValue("status", status, initialStatus)}
              />
            ))}
          </ChipGroup>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center justify-center gap-1.5 self-start rounded-full border border-gold/40 px-3.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold-light/30 lg:self-center"
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
    <GoldSelect
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={options}
    />
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
        selected
          ? "border-gold bg-gold text-white shadow-sm"
          : "border-line bg-white text-ink hover:border-gold/60 hover:bg-gold-light/25"
      }`}
    >
      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      {label}
    </button>
  );
}
