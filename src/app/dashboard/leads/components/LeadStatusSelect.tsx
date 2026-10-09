"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { LEAD_STATUSES } from "@/lib/leads-data";

export default function StatusSelect({
  value,
  onChange,
  compact = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const selected = LEAD_STATUSES.find((status) => status === value) ?? "New";

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = Math.max(rect.width, 170);
    const left = Math.min(rect.left, window.innerWidth - menuWidth - 12);
    const roomBelow = window.innerHeight - rect.bottom;
    const menuHeight = 196;
    const top = roomBelow >= menuHeight || rect.top < menuHeight
      ? rect.bottom + 6
      : rect.top - menuHeight - 6;
    setPosition({ top: Math.max(8, top), left: Math.max(8, left), width: menuWidth });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const closeOnOutside = (event: MouseEvent) => {
      // The menu is portalled to <body>, so it is outside the button. Without
      // this check the menu unmounts on mousedown, before the option's click
      // fires, and the status never changes.
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", closeOnOutside);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", closeOnOutside);
    };
  }, [open]);

  function choose(status: string) {
    setOpen(false);
    if (status !== value) onChange(status);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={`inline-flex items-center justify-between gap-2 border border-line bg-surface font-semibold text-ink outline-none transition-colors hover:border-gold hover:bg-white focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? "min-w-[132px] rounded-full px-3 py-1.5 text-xs" : "w-full rounded-lg px-3 py-2.5 text-sm"
        }`}
      >
        <span>{selected}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gold transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="fixed z-[100] overflow-hidden rounded-xl border border-gold/40 bg-white p-1 shadow-lg"
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            {LEAD_STATUSES.map((status) => {
              const selectedRow = status === value;
              return (
                <button
                  key={status}
                  type="button"
                  role="option"
                  aria-selected={selectedRow}
                  onClick={() => choose(status)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    selectedRow
                      ? "bg-gold font-semibold text-white"
                      : "text-ink hover:bg-gold-light/50"
                  }`}
                >
                  <span>{status}</span>
                  {selectedRow && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
