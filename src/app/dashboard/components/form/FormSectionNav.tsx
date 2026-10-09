"use client";

import { useCallback, useState } from "react";
import { Check } from "lucide-react";

export interface FormSection {
  id: string;
  label: string;
}

/**
 * Click-driven active section. There is intentionally NO scroll detection:
 * the highlighted section is simply the last one the user clicked.
 */
export function useActiveSection(sections: FormSection[]) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  const selectSection = useCallback((id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return { activeId, selectSection };
}

export default function FormSectionNav({
  sections,
  activeId,
  onSelect,
  completedIds = [],
}: {
  sections: FormSection[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Section ids whose fields are filled in; shown with a gold tick. */
  completedIds?: string[];
}) {
  return (
    <nav className="space-y-1 rounded-2xl border border-line bg-white p-3">
      {sections.map((section, idx) => {
        const isActive = section.id === activeId;
        const isDone = completedIds.includes(section.id);
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(e) => {
              e.preventDefault();
              onSelect(section.id);
            }}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-gold-light/30 text-navy" : "text-muted hover:bg-surface"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                isActive || isDone ? "bg-gold text-white" : "bg-line text-muted"
              }`}
            >
              {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : idx + 1}
            </span>
            {section.label}
          </a>
        );
      })}
    </nav>
  );
}
