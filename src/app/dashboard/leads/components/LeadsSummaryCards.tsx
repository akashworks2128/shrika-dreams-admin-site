import { CheckCircle2, ClipboardList, Clock3, PhoneCall } from "lucide-react";
import StatCard from "@/app/dashboard/components/StatCard";
import type { LeadSummaryCounts } from "@/lib/leads-data";

export default function LeadsSummaryCards({ counts }: { counts: LeadSummaryCounts }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard icon={ClipboardList} label="All Leads" value={counts.all} supportingText="All enquiries received" />
      <StatCard icon={Clock3} label="New" value={counts.newLeads} supportingText="Awaiting first contact" />
      <StatCard icon={PhoneCall} label="Follow-up" value={counts.followUps} supportingText="Leads needing follow-up" />
      <StatCard icon={CheckCircle2} label="Closed" value={counts.closed} supportingText="Successfully closed" />
    </div>
  );
}
