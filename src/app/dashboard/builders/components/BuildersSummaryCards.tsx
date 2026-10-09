import { Contact, Eye, FileText } from "lucide-react";
import StatCard from "@/app/dashboard/components/StatCard";
import type { BuilderSummaryCounts } from "@/lib/builders-data";

// Three cards, not four: `builders` has no is_featured column, so there
// is deliberately no Featured card here — see the schema note in
// builders-data.ts.
export default function BuildersSummaryCards({ counts }: { counts: BuilderSummaryCounts }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard
        className="col-span-2 sm:col-span-1"
        icon={Contact}
        label="Total Builders"
        value={counts.all}
        supportingText="All builders in the system"
      />
      <StatCard
        icon={Eye}
        label="Published"
        value={counts.published}
        supportingText="Visible on website"
      />
      <StatCard
        icon={FileText}
        label="Drafts"
        value={counts.drafts}
        supportingText="Not published yet"
      />
    </div>
  );
}
