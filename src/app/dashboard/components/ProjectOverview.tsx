import type { ProjectOverviewCounts } from "@/lib/dashboard-data";

interface RowProps {
  label: string;
  value: number;
  max: number;
  colorClassName: string;
}

function Row({ label, value, max, colorClassName }: RowProps) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full ${colorClassName}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProjectOverview({ counts }: { counts: ProjectOverviewCounts }) {
  const max = Math.max(
    counts.apartments,
    counts.plots,
    counts.readyToMove,
    counts.underConstruction,
    1
  );

  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h3 className="text-sm font-bold text-ink sm:text-base">Project Overview</h3>

      <div className="mt-4 space-y-4">
        <Row label="Apartments" value={counts.apartments} max={max} colorClassName="bg-navy" />
        <Row label="Plots" value={counts.plots} max={max} colorClassName="bg-gold" />
        <Row
          label="Ready to Move"
          value={counts.readyToMove}
          max={max}
          colorClassName="bg-navy"
        />
        <Row
          label="Under Construction"
          value={counts.underConstruction}
          max={max}
          colorClassName="bg-gold"
        />
      </div>
    </div>
  );
}
