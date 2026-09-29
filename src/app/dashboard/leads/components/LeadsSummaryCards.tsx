import { CheckCircle2, ClipboardList, Clock3, MapPin } from "lucide-react";
import StatCard from "@/app/dashboard/components/StatCard";
import type { LeadSummaryCounts } from "@/lib/leads-data";

export default function LeadsSummaryCards({ counts }: { counts: LeadSummaryCounts }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={ClipboardList} label="All Leads" value={counts.all} supportingText="All enquiries received" />
      <StatCard icon={Clock3} label="New" value={counts.newLeads} supportingText="Awaiting first contact" />
      <StatCard icon={MapPin} label="Site Visits" value={counts.siteVisits} supportingText="Site visits requested" />
      <StatCard icon={CheckCircle2} label="Closed" value={counts.closed} supportingText="Successfully closed" />
    </div>
  );
}
