import type { WebsiteOverviewCounts } from "@/lib/dashboard-data";

function Row({
  label,
  value,
  dotClassName,
}: {
  label: string;
  value: number;
  dotClassName: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`} />
        <span className="text-sm text-ink">{label}</span>
      </div>
      <span className="text-sm font-bold text-ink">{value}</span>
    </div>
  );
}

export default function WebsiteOverview({ counts }: { counts: WebsiteOverviewCounts }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h3 className="text-sm font-bold text-ink sm:text-base">Website Overview</h3>

      <div className="mt-2 divide-y divide-line">
        <Row label="Published Projects" value={counts.publishedProjects} dotClassName="bg-gold" />
        <Row label="Draft Projects" value={counts.draftProjects} dotClassName="bg-gold-light" />
        <Row label="Published Blogs" value={counts.publishedBlogs} dotClassName="bg-navy" />
        <Row label="New Leads Today" value={counts.newLeadsToday} dotClassName="bg-navy-dark" />
      </div>
    </div>
  );
}
