"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 12) {
        setShowHeader(true);
      } else if (currentY > lastScrollY.current + 4) {
        setShowHeader(false);
      } else if (currentY < lastScrollY.current - 4) {
        setShowHeader(true);
      }

      lastScrollY.current = currentY;
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur transition-transform duration-200 sm:px-6 sm:py-4 md:px-8 md:py-5 ${
        showHeader ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
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
          <div className="hidden sm:block">{action}</div>

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
      </div>

      <div className="mt-3 w-full sm:hidden">{action}</div>
    </header>
  );
}
