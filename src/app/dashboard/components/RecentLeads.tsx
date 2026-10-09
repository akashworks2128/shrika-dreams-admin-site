import Link from "next/link";
import { Inbox } from "lucide-react";
import type { RecentLead } from "@/lib/dashboard-data";

const STATUS_STYLES: Record<string, string> = {
  New: "bg-line/70 text-ink",
  Contacted: "bg-gold-light/60 text-navy",
  "Site Visit": "bg-gold text-white",
  Negotiation: "bg-navy text-white",
  Closed: "bg-navy-dark text-white",
  Lost: "bg-line text-muted",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-line/70 text-ink";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${style}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default function RecentLeads({ leads }: { leads: RecentLead[] }) {
  return (
    <div className="flex min-h-[300px] flex-col rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink sm:text-base">Recent Leads</h3>
        <Link
          href="/dashboard/leads"
          className="text-xs font-semibold text-gold hover:underline sm:text-sm"
        >
          View All Leads →
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Inbox className="h-5 w-5 text-muted" />
          </div>
          <p className="text-sm font-medium text-muted">No enquiries yet.</p>
        </div>
      ) : (
        <div className="mt-4 -mx-1 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                <th className="px-1 pb-3 font-bold">Name</th>
                <th className="px-1 pb-3 font-bold">Interested Project</th>
                <th className="px-1 pb-3 font-bold">Status</th>
                <th className="px-1 pb-3 font-bold">Date</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-line">
                  <td className="px-1 py-3 font-semibold text-ink whitespace-nowrap">
                    {lead.name}
                  </td>
                  <td className="px-1 py-3 text-muted whitespace-nowrap">
                    {lead.projectName ?? "—"}
                  </td>
                  <td className="px-1 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-1 py-3 text-muted whitespace-nowrap">
                    {formatDate(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
