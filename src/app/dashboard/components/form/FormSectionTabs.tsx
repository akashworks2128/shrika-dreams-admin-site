"use client";

import { Check } from "lucide-react";
import type { FormSection } from "./FormSectionNav";

/**
 * Horizontal version of the section navigation (1, 2, 3 ...).
 * Used on small screens for long forms and as the main nav for short forms.
 */
export default function FormSectionTabs({
  sections,
  activeId,
  onSelect,
  completedIds = [],
  className = "",
}: {
  sections: FormSection[];
  activeId: string;
  onSelect: (id: string) => void;
  completedIds?: string[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Form sections"
      className={`flex gap-2 overflow-x-auto rounded-2xl border border-line bg-white p-2 ${className}`}
    >
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
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
