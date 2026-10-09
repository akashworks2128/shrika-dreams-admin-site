import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

/** Slim gold tips strip shown above the first form section. */
export default function FormTipsBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-gold-light bg-gold-light/20 px-4 py-3 text-sm text-ink/80">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <p>{children}</p>
    </div>
  );
}
