"use client";

import { createContext, useContext, useState } from "react";
import { X } from "lucide-react";
import Sidebar from "./Sidebar";

interface ShellContextValue {
  openMenu: () => void;
}

const ShellContext = createContext<ShellContextValue>({ openMenu: () => {} });

export function useShell() {
  return useContext(ShellContext);
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden w-[240px] shrink-0 lg:block">
        <div className="fixed h-screen w-[240px]">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-[260px] max-w-[80vw] flex-col shadow-2xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen w-full min-w-0 flex-col">
        {/* Header slot is rendered by page content via context prop drilling */}
        <ShellContext.Provider value={{ openMenu: () => setMenuOpen(true) }}>
          {children}
        </ShellContext.Provider>
      </div>
    </div>
  );
}
