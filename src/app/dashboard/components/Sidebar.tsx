"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Users,
  Newspaper,
  Contact,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const MAIN_NAV: NavItem[] = [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }];

const CONTENT_NAV: NavItem[] = [
  { label: "Projects", href: "/dashboard/projects", icon: Building2 },
  { label: "Localities", href: "/dashboard/localities", icon: MapPin },
  { label: "Builders", href: "/dashboard/builders", icon: Contact },
  { label: "Blog", href: "/dashboard/blog", icon: Newspaper },
];

const CRM_NAV: NavItem[] = [{ label: "Leads", href: "/dashboard/leads", icon: Users }];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-white/[0.08] text-white border-l-2 border-gold pl-[10px]"
          : "text-white/60 hover:bg-white/[0.05] hover:text-white/90 border-l-2 border-transparent pl-[10px]"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${
          isActive ? "text-gold" : "text-white/50 group-hover:text-white/80"
        }`}
      />
      <span>{item.label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
      {children}
    </p>
  );
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-navy" onClick={onNavigate}>
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <p className="text-[15px] font-bold tracking-wide text-white">SHRIKA DREAMS</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="text-[11px] font-medium text-white/50">Admin Panel</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <SectionLabel>Content</SectionLabel>
        <div className="space-y-1">
          {CONTENT_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <SectionLabel>CRM</SectionLabel>
        <div className="space-y-1">
          {CRM_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="border-t border-white/10 px-3 py-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLogout();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white/90"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 text-white/50" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
