"use client";

import { AlertCircle, X } from "lucide-react";

interface ErrorToastProps {
  message: string | null;
  onDismiss: () => void;
}

export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-4 bottom-4 z-[100] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(28rem,calc(100vw-2.5rem))]"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3.5 shadow-2xl ring-1 ring-black/5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <p className="min-w-0 flex-1 break-words text-sm leading-5 text-ink">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 rounded-md p-1 text-muted transition hover:bg-surface hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
