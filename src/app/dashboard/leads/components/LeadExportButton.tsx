"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export default function LeadExportButton() {
  const [busy, setBusy] = useState(false);
  async function exportCsv() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/leads/export");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not export leads.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `shrika-dreams-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not export leads.");
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" onClick={exportCsv} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold px-3.5 py-2.5 text-sm font-semibold text-gold hover:bg-gold-light/20 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV</button>;
}
