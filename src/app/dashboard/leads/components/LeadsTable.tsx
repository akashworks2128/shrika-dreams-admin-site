"use client";

import { useState } from "react";
import { Eye, Inbox, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { LeadListItem } from "@/lib/leads-data";
import { LEAD_STATUSES } from "@/lib/leads-data";
import { useRouter } from "next/navigation";

const STATUS_STYLES: Record<string, string> = {
  New: "bg-line/70 text-ink",
  Contacted: "bg-gold-light/60 text-navy",
  "Site Visit": "bg-gold text-white",
  Negotiation: "bg-navy text-white",
  Closed: "bg-navy-dark text-white",
  Lost: "bg-line text-muted",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LeadsTable({ items, hasActiveFilters, error }: { items: LeadListItem[]; hasActiveFilters: boolean; error: string | null }) {
  if (error) {
    return <div className="p-8 text-center text-sm text-red-600">Unable to load leads: {error}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
          <Inbox className="h-5 w-5 text-muted" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{hasActiveFilters ? "No leads match your filters" : "No leads yet"}</p>
          <p className="mt-1 text-xs text-muted">Website enquiries will appear here when they are received.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-surface text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-5 py-3">Lead</th>
              <th className="px-5 py-3">Interested Project</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Received</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {items.map((item) => <LeadRow key={item.id} item={item} />)}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-line md:hidden">
        {items.map((item) => <LeadCard key={item.id} item={item} />)}
      </div>
    </>
  );
}

function LeadRow({ item }: { item: LeadListItem }) {
  const [open, setOpen] = useState(false);
  return (
    <tr className="hover:bg-surface/60">
      <td className="px-5 py-4"><p className="font-semibold text-ink">{item.name || "Unnamed lead"}</p></td>
      <td className="px-5 py-4 text-muted">{item.projectName ?? "—"}</td>
      <td className="px-5 py-4"><StatusSelect item={item} /></td>
      <td className="px-5 py-4 text-muted">{formatDate(item.createdAt)}</td>
      <td className="px-5 py-4 text-right"><button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface"><Eye className="h-3.5 w-3.5" /> View</button></td>
      {open && <LeadDetails item={item} onClose={() => setOpen(false)} />}
    </tr>
  );
}

function LeadCard({ item }: { item: LeadListItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold text-ink">{item.name || "Unnamed lead"}</p><p className="mt-1 text-xs text-muted">{item.projectName ?? "No project selected"}</p></div>
        <StatusSelect item={item} compact />
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{formatDate(item.createdAt)}</span>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 font-semibold text-gold"><Eye className="h-3.5 w-3.5" /> View</button>
      </div>
      {open && <LeadDetails item={item} onClose={() => setOpen(false)} />}
    </div>
  );
}

function StatusSelect({ item, compact = false }: { item: LeadListItem; compact?: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function updateStatus(value: string) {
    if (!value || value === item.status || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("leads").update({ status: value }).eq("id", item.id);
    setSaving(false);
    if (!error) router.refresh();
  }

  return (
    <div className="relative inline-flex">
      <select
        value={item.status}
        disabled={saving}
        onChange={(event) => updateStatus(event.target.value)}
        className={`${compact ? "max-w-[125px]" : "max-w-[145px]"} appearance-none rounded-full border-0 bg-transparent pr-4 text-xs font-semibold outline-none disabled:opacity-60 ${STATUS_STYLES[item.status] ?? "bg-line/70 text-ink"}`}
      >
        {LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
    </div>
  );
}

function LeadDetails({ item, onClose }: { item: LeadListItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onMouseDown={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.08em] text-gold">Lead Details</p><h3 className="mt-1 text-xl font-bold text-ink">{item.name || "Unnamed lead"}</h3></div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail label="Name" value={item.name || "—"} />
          <Detail label="Status" value={item.status || "—"} />
          <Detail label="Interested Project" value={item.projectName ?? "—"} />
          <Detail label="Received" value={formatDate(item.createdAt)} />
          <Detail label="Lead ID" value={item.id} full />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return <div className={`${full ? "sm:col-span-2" : ""} rounded-xl border border-line bg-surface p-3`}><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p><p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p></div>;
}
