"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Inbox, Loader2, X } from "lucide-react";
import type { LeadListItem } from "@/lib/leads-data";
import { LEAD_STATUSES } from "@/lib/leads-data";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });
}

export default function LeadsTable({
  items,
  hasActiveFilters,
  error,
}: {
  items: LeadListItem[];
  hasActiveFilters: boolean;
  error: string | null;
}) {
  if (error)
    return (
      <div className="p-8 text-center text-sm text-red-600">
        Unable to load leads: {error}
      </div>
    );

  if (items.length === 0)
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
          <Inbox className="h-5 w-5 text-muted" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">
            {hasActiveFilters ? "No leads match your filters" : "No leads yet"}
          </p>
          <p className="mt-1 text-xs text-muted">
            Website enquiries will appear here when they are received.
          </p>
        </div>
      </div>
    );

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="bg-surface text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Budget</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {items.map((item) => (
              <LeadRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-line lg:hidden">
        {items.map((item) => (
          <LeadCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}

function StatusSelect({
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

function LeadRow({ item }: { item: LeadListItem }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: string) {
    if (saving || status === item.status) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/leads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: item.id, status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not update status.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="hover:bg-surface/60">
      <td className="px-4 py-4">
        <p className="font-semibold text-ink">{item.name || "Unnamed lead"}</p>
        <p className="mt-0.5 text-xs text-muted">{item.email || "No email"}</p>
        {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-muted">{item.phone || "—"}</td>
      <td className="px-4 py-4 text-muted">{item.projectName ?? "—"}</td>
      <td className="max-w-[280px] px-4 py-4">
        <DescriptionButton message={item.message} />
      </td>
      <td className="px-4 py-4 text-muted">{item.budget ?? "—"}</td>
      <td className="px-4 py-4">
        <StatusSelect value={item.status} onChange={updateStatus} compact disabled={saving} />
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDate(item.createdAt)}</td>
    </tr>
  );
}

function LeadCard({ item }: { item: LeadListItem }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: string) {
    if (saving || status === item.status) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/leads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: item.id, status }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not update status.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{item.name || "Unnamed lead"}</p>
          <p className="mt-1 truncate text-xs text-muted">{item.email || "No email"}</p>
        </div>
        <StatusSelect value={item.status} onChange={updateStatus} compact disabled={saving} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Phone</span>
          <p className="mt-0.5 truncate text-ink" title={item.phone || undefined}>{item.phone || "—"}</p>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Project</span>
          <p className="mt-0.5 truncate text-ink" title={item.projectName || undefined}>{item.projectName || "No project selected"}</p>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Budget</span>
          <p className="mt-0.5 truncate text-ink" title={item.budget || undefined}>{item.budget || "—"}</p>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Received</span>
          <p className="mt-0.5 truncate text-ink">{formatDate(item.createdAt)}</p>
        </div>
        <div className="col-span-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Description</span>
          <div className="mt-0.5 min-w-0"><DescriptionButton message={item.message} /></div>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </article>
  );
}

function DescriptionButton({ message }: { message: string | null }) {
  const [open, setOpen] = useState(false);
  const text = message?.trim() || "";

  return (
    <>
      {text ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full min-w-0 max-w-full text-left text-sm text-muted underline decoration-gold/40 underline-offset-2 transition-colors hover:text-ink"
          title="Click to read full description"
        >
          <span className="block w-full truncate">{text}</span>
        </button>
      ) : (
        <span className="text-muted">—</span>
      )}

      {open && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 py-6"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-line bg-white p-5 text-left shadow-xl sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-gold">Lead Description</p>
                <h3 className="mt-1 text-xl font-bold text-ink">Client Message</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close description"
                className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-line bg-surface p-4 sm:p-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink">{text}</p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function LeadDetails({ item, onClose }: { item: LeadListItem; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [date, setDate] = useState(item.nextFollowUpDate ?? "");
  const [time, setTime] = useState(item.nextFollowUpTime?.slice(0, 5) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/leads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: item.id,
          status,
          notes,
          nextFollowUpDate: date,
          nextFollowUpTime: time,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not save lead.");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save lead.");
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-white p-5 text-left shadow-xl sm:p-6" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-gold">Lead Details</p>
            <h3 className="mt-1 text-xl font-bold text-ink">{item.name || "Unnamed lead"}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail label="Phone" value={item.phone || "—"} />
          <Detail label="Email" value={item.email || "—"} />
          <Detail label="WhatsApp" value={item.whatsapp || "—"} />
          <Detail label="Preferred Contact" value={item.preferredContact || "—"} />
          <Detail label="Project" value={item.projectName || "—"} />
          <Detail label="Builder" value={item.builderName || "—"} />
          <Detail label="Locality" value={item.localityName || "—"} />
          <Detail label="Property Type" value={item.propertyType || "—"} />
          <Detail label="BHK / Configuration" value={item.bhk || "—"} />
          <Detail label="Budget" value={item.budget || "—"} />
          <Detail label="Source" value={item.source || "—"} />
          <Detail label="Received" value={formatDate(item.createdAt)} />
          <Detail label="Message" value={item.message || "—"} full />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Status</label>
            <StatusSelect value={status} onChange={setStatus} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Next Follow-up Date</label>
            <FollowUpDatePicker value={date} onChange={setDate} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Next Follow-up Time</label>
            <FollowUpTimePicker value={time} onChange={setTime} />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-semibold text-ink">Notes</label>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Add internal notes about this lead…" className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-gold focus:ring-2 focus:ring-amber-200" />
        </div>

        {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Lead
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Detail({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} rounded-xl border border-line bg-surface p-3`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}


function toLocalDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function displayDate(value: string): string {
  if (!value) return "Select follow-up date";
  const date = toLocalDate(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function FollowUpDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = value ? toLocalDate(value) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : new Date(month.getFullYear(), month.getMonth(), index - firstDay + 1)
  );
  const selected = value ? isoDate(toLocalDate(value)) : "";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-sm text-ink outline-none transition-colors hover:border-gold focus:ring-2 focus:ring-amber-200">
        <span className={value ? "font-medium" : "text-muted"}>{displayDate(value)}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-gold" />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[80] w-[292px] rounded-xl border border-gold/30 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"><ChevronLeft className="h-4 w-4" /></button>
            <p className="text-sm font-bold text-ink">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
            <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (!day) return <span key={`blank-${index}`} className="h-9" />;
              const dayIso = isoDate(day);
              const isSelected = dayIso === selected;
              const isToday = dayIso === isoDate(new Date());
              return <button key={dayIso} type="button" onClick={() => { onChange(dayIso); setOpen(false); }} className={`h-9 rounded-lg text-xs font-medium transition-colors ${isSelected ? "bg-gold text-white" : isToday ? "border border-gold text-navy" : "text-ink hover:bg-gold-light/40"}`}>{day.getDate()}</button>;
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-2">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs font-semibold text-muted hover:text-ink">Clear</button>
            <button type="button" onClick={() => { const today = new Date(); onChange(isoDate(today)); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setOpen(false); }} className="text-xs font-semibold text-gold">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? 0 : 30;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const hour12 = hours % 12 || 12;
  const suffix = hours >= 12 ? "PM" : "AM";
  return { value, label: `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}` };
});

function FollowUpTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = TIME_OPTIONS.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-sm text-ink outline-none transition-colors hover:border-gold focus:ring-2 focus:ring-amber-200">
        <span className={selected ? "font-medium" : "text-muted"}>{selected?.label ?? "Select follow-up time"}</span>
        <Clock3 className="h-4 w-4 shrink-0 text-gold" />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[80] max-h-64 w-full overflow-y-auto rounded-xl border border-gold/30 bg-white p-1.5 shadow-xl">
          {TIME_OPTIONS.map((option) => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${option.value === value ? "bg-gold font-semibold text-white" : "text-ink hover:bg-gold-light/40"}`}>
              {option.label}
              {option.value === value && <Check className="h-4 w-4" />}
            </button>
          ))}
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="mt-1 w-full border-t border-line px-3 py-2 text-left text-xs font-semibold text-muted hover:text-ink">Clear time</button>
        </div>
      )}
    </div>
  );
}
