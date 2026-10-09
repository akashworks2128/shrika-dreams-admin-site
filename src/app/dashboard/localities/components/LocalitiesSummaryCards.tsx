import { Eye, FileText, MapPin } from "lucide-react";
import StatCard from "@/app/dashboard/components/StatCard";
import type { LocalitySummaryCounts } from "@/lib/localities-data";

// Three cards, not four: `localities` has no is_featured column (unlike
// projects), so there is deliberately no Featured card here — see the
// schema note in localities-data.ts.
export default function LocalitiesSummaryCards({
  counts,
}: {
  counts: LocalitySummaryCounts;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard
        className="col-span-2 sm:col-span-1"
        icon={MapPin}
        label="Total Localities"
        value={counts.all}
        supportingText="All localities in the system"
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
