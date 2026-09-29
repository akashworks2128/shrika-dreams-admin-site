"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "section-basic", label: "Basic Information" },
  { id: "section-pricing", label: "Pricing" },
  { id: "section-overview", label: "Project Overview" },
  { id: "section-details", label: "Property Details" },
  { id: "section-highlights", label: "Highlights & Amenities" },
  { id: "section-images", label: "Images & Documents" },
  { id: "section-location", label: "Location" },
  { id: "section-connectivity", label: "Nearby & Connectivity" },
  { id: "section-publishing", label: "Publishing" },
];

export function useActiveSection() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return activeId;
}

export default function FormSectionNav({ activeId }: { activeId: string }) {
  const activeIndex = SECTIONS.findIndex((s) => s.id === activeId);

  return (
    <nav className="space-y-1 rounded-2xl border border-line bg-white p-3">
      {SECTIONS.map((section, idx) => {
        const isActive = section.id === activeId;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-gold-light/30 text-navy" : "text-muted hover:bg-surface"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                isActive ? "bg-gold text-white" : "bg-line text-muted"
              }`}
            >
              {idx + 1}
            </span>
            {section.label}
          </a>
        );
      })}
      <p className="sr-only">Step {activeIndex + 1} of {SECTIONS.length}</p>
    </nav>
  );
}

export { SECTIONS };
