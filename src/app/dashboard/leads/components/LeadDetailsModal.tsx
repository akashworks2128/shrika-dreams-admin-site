"use client";

// Lead details / follow-up editor. The Leads table no longer renders a View
// button, so this is not mounted anywhere right now; it is kept intact so the
// notes + follow-up date/time UI can be re-attached later without a rewrite.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Loader2, X } from "lucide-react";
import type { LeadListItem } from "@/lib/leads-data";
import LeadStatusSelect from "./LeadStatusSelect";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LeadDetails({ item, onClose }: { item: LeadListItem; onClose: () => void }) {
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
            <LeadStatusSelect value={status} onChange={setStatus} />
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
