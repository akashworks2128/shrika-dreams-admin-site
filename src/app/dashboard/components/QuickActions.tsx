import Link from "next/link";
import { Building2, MapPin, Contact } from "lucide-react";

const ACTIONS = [
  {
    label: "Add Project",
    description: "Create a new property listing",
    href: "/dashboard/projects/new",
    icon: Building2,
  },
  {
    label: "Add Locality",
    description: "Add a new micro-market",
    href: "/dashboard/localities/new",
    icon: MapPin,
  },
  {
    label: "Add Builder",
    description: "Add a developer partner",
    href: "/dashboard/builders/new",
    icon: Contact,
  },
];

export default function QuickActions() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h3 className="text-sm font-bold text-ink sm:text-base">Quick Actions</h3>

      <div className="mt-4 space-y-2.5">
        {ACTIONS.map(({ label, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 transition-colors hover:border-gold/60 hover:bg-gold-light/20"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold text-white">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{label}</p>
              <p className="truncate text-xs text-muted">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
