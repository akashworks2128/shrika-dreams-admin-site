"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface GoldSelectOption {
  value: string;
  label: string;
}

interface GoldSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: GoldSelectOption[];
  placeholder: string;
  hasError?: boolean;
  disabled?: boolean;
  /** Extra classes for the trigger button (e.g. border / background overrides). */
  className?: string;
  /** Hide the first placeholder row when the control is a required field. */
  includePlaceholder?: boolean;
}

/**
 * Custom dropdown that replaces the native <select> so the opened list can
 * use the site's gold theme (native option lists can't be styled).
 * The first row is always the "All ..." / placeholder row that clears the value.
 */
export default function GoldSelect({
  value,
  onChange,
  options,
  placeholder,
  hasError,
  disabled,
  className = "",
  includePlaceholder = true,
}: GoldSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const rows: GoldSelectOption[] = includePlaceholder
    ? [{ value: "", label: placeholder }, ...options]
    : options;
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the keyboard-highlighted row visible.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    if (disabled) return;
    setActive(Math.max(0, rows.findIndex((r) => r.value === value)));
    setOpen(true);
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active >= 0) choose(rows[active].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-surface py-2.5 pl-3 pr-2.5 text-left text-sm outline-none transition-colors focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60 ${
          hasError ? "border-red-300" : open ? "border-gold" : "border-line"
        } ${selected ? "text-ink" : "text-gray-400"} ${className}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gold transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-gold/40 bg-white p-1 shadow-lg"
        >
          {rows.map((row, idx) => {
            const isSelected = row.value === value;
            const isActive = idx === active;
            return (
              <li
                key={row.value || "__all"}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(idx)}
                onClick={() => choose(row.value)}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                  isSelected
                    ? "bg-gold font-semibold text-white"
                    : isActive
                      ? "bg-gold-light/50 text-navy"
                      : row.value === ""
                        ? "text-muted"
                        : "text-ink"
                }`}
              >
                <span className="truncate">{row.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
