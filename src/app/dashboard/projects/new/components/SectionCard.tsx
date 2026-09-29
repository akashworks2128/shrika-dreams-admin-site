import type { ReactNode } from "react";

export default function SectionCard({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold text-ink sm:text-lg">
        {number}. {title}
      </h2>
      <p className="mt-1 text-xs text-muted sm:text-sm">{description}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}
