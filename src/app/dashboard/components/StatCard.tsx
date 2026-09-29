import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  supportingText: string;
}

export default function StatCard({ icon: Icon, label, value, supportingText }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-light/40">
          <Icon className="h-4 w-4 text-gold" />
        </div>
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none text-ink sm:text-3xl">{value}</p>
      <p className="mt-1.5 text-xs text-muted">{supportingText}</p>
    </div>
  );
}
