import { Building2, Eye, FileText, Star } from "lucide-react";
import StatCard from "@/app/dashboard/components/StatCard";
import type { ProjectSummaryCounts } from "@/lib/projects-data";

export default function ProjectsSummaryCards({ counts }: { counts: ProjectSummaryCounts }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        icon={Building2}
        label="All Projects"
        value={counts.all}
        supportingText="Total projects in the system"
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
      <StatCard
        icon={Star}
        label="Featured"
        value={counts.featured}
        supportingText="Highlighted on website"
      />
    </div>
  );
}
