import { Lightbulb } from "lucide-react";
import type { FormSection } from "./FormSectionNav";

const DEFAULT_TIPS = [
  "Fill all required fields marked with *",
  "Add high-quality image URLs for a better listing once Storage is connected",
  "Keep descriptions clear and concise",
];

export default function FormProgressPanel({
  sections,
  activeId,
  tips = DEFAULT_TIPS,
}: {
  sections: FormSection[];
  activeId: string;
  tips?: string[];
}) {
  const activeIndex = Math.max(
    sections.findIndex((s) => s.id === activeId),
    0
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Form Progress</p>
          <p className="text-xs font-semibold text-muted">
            {activeIndex + 1} / {sections.length}
          </p>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${((activeIndex + 1) / sections.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gold-light bg-gold-light/20 p-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-gold" />
          <p className="text-sm font-bold text-ink">Quick Tips</p>
        </div>
        <ul className="mt-3 space-y-2">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-ink/80">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
