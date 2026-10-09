import { Check, Circle, Lightbulb } from "lucide-react";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

const DEFAULT_TIPS = [
  "Fill all required fields marked with *",
  "Add high-quality image URLs for a better listing once Storage is connected",
  "Keep descriptions clear and concise",
];

/**
 * Right-hand panel: a real completion checklist (driven by form values, not
 * scroll position) plus quick tips.
 */
export default function FormProgressPanel({
  checklist,
  tips = DEFAULT_TIPS,
}: {
  checklist: ChecklistItem[];
  tips?: string[];
}) {
  const doneCount = checklist.filter((i) => i.done).length;
  const total = checklist.length;
  const allDone = total > 0 && doneCount === total;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-ink">
            {allDone ? "Ready to publish" : "Required to publish"}
          </p>
          <p className="text-xs font-semibold text-gold">
            {doneCount} / {total}
          </p>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
          />
        </div>

        <ul className="mt-3 space-y-1.5">
          {checklist.map((item) => (
            <li
              key={item.label}
              className={`flex items-center gap-2 text-xs ${
                item.done ? "font-medium text-ink" : "text-muted"
              }`}
            >
              {item.done ? (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold text-white">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-line" />
              )}
              {item.label}
            </li>
          ))}
        </ul>
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
