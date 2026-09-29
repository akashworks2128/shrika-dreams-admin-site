"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function BuildersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[builders] page error:", error);
  }, [error]);

  return (
    <main className="flex-1 px-4 py-10 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-line bg-white p-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <h2 className="text-base font-bold text-ink">Couldn&apos;t load builders</h2>
        <p className="text-sm text-muted">
          Something went wrong while fetching builder data. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
