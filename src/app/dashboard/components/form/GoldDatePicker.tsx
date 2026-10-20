"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface GoldDatePickerProps {
  /** ISO date, YYYY-MM-DD (or "" for none). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  /** Allow the Clear button (default true). */
  clearable?: boolean;
  ariaLabel?: string;
  className?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseIso(v: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!match) return null;
  return { y: +match[1], m: +match[2] - 1, d: +match[3] };
}

function todayParts() {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
}

/**
 * Custom date picker in the admin's gold theme. Replaces the native
 * <input type="date"> popup (which cannot be styled). Value is YYYY-MM-DD.
 */
export default function GoldDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  hasError,
  disabled,
  clearable = true,
  ariaLabel,
  className = "",
}: GoldDatePickerProps) {
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const s = parseIso(value) ?? todayParts();
    return { y: s.y, m: s.m };
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function toggle() {
    if (disabled) return;
    if (!open) {
      const s = parseIso(value) ?? todayParts();
      setView({ y: s.y, m: s.m });
    }
    setOpen((o) => !o);
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const total = v.y * 12 + v.m + delta;
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });
  }

  function pick(y: number, m: number, d: number) {
    onChange(toIso(y, m, d));
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  // 6 weeks grid starting on Sunday, including leading/trailing days.
  const first = new Date(view.y, view.m, 1);
  const start = new Date(view.y, view.m, 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate(), inMonth: dt.getMonth() === view.m };
  });
  const today = todayParts();

  const display = selected ? `${pad(selected.d)}-${pad(selected.m + 1)}-${selected.y}` : "";

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
        className={`flex w-full items-center gap-2.5 rounded-lg border bg-surface py-2.5 pl-3 pr-3 text-left text-sm outline-none transition-colors focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60 ${
          hasError ? "border-red-300" : open ? "border-gold" : "border-line"
        } ${display ? "text-ink" : "text-gray-400"} ${className}`}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-gold" />
        <span className="truncate">{display || placeholder}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className="absolute left-0 z-40 mt-1.5 w-[17.5rem] max-w-[calc(100vw-2rem)] rounded-xl border border-gold/40 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-navy hover:bg-gold-light/50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-navy">
              {MONTHS[view.m]} {view.y}
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-navy hover:bg-gold-light/50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-gold">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1.5">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
            {cells.map((c) => {
              const isSelected = !!selected && c.y === selected.y && c.m === selected.m && c.d === selected.d;
              const isToday = c.y === today.y && c.m === today.m && c.d === today.d;
              return (
                <button
                  key={`${c.y}-${c.m}-${c.d}`}
                  type="button"
                  onClick={() => pick(c.y, c.m, c.d)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isSelected
                      ? "bg-gold font-semibold text-white"
                      : isToday
                        ? "border border-gold text-navy hover:bg-gold-light/50"
                        : c.inMonth
                          ? "text-ink hover:bg-gold-light/50"
                          : "text-gray-300 hover:bg-gold-light/30"
                  }`}
                >
                  {c.d}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs font-semibold">
            {clearable ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-muted hover:bg-surface hover:text-navy"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => pick(today.y, today.m, today.d)}
              className="rounded-md px-2 py-1 text-gold hover:bg-gold-light/40"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
