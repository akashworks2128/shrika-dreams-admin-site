"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Search, Menu, ArrowLeft } from "lucide-react";
import { useShell } from "./DashboardShell";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  adminName: string;
  action?: ReactNode;
  backHref?: string;
}

export default function DashboardHeader({
  title,
  subtitle,
  adminName,
  action,
  backHref,
}: DashboardHeaderProps) {
  const { openMenu } = useShell();
  const initial = adminName.trim().charAt(0).toUpperCase() || "A";

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 px-4 py-5 sm:px-6 md:px-8 md:py-7">
      <div className="flex items-start gap-3 min-w-0">
        <button
          type="button"
          onClick={openMenu}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Go back"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-surface"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            <h1 className="text-xl font-bold text-ink sm:text-2xl md:text-[28px]">{title}</h1>
          </div>
          <p className="mt-1 truncate text-xs text-muted sm:text-sm">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {action}

        <button
          type="button"
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:text-ink sm:h-10 sm:w-10"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-white sm:h-10 sm:w-10">
            {initial}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">{adminName}</p>
            <p className="text-xs leading-tight text-muted">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
