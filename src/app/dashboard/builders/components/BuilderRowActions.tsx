"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface BuilderRowActionsProps {
  builderId: string;
  builderName: string;
  builderSlug: string | null;
}

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-navy";

// Same rule as Projects: NEXT_PUBLIC_SITE_URL in production, localhost in dev.
const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
const SITE_URL =
  configuredSiteUrl || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");

export default function BuilderRowActions({
  builderId,
  builderName,
  builderSlug,
}: BuilderRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function handleDelete() {
    // `deleting` guards this from firing twice (e.g. a fast double click),
    // since the confirm button is disabled while it's true.
    if (deleting) return;
    setDeleting(true);
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.from("builders").delete().eq("id", builderId);

    setDeleting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setConfirmOpen(false);

    // Preserve current search/filters/page, flag success for the
    // page-level toast, and let the server component re-fetch the list +
    // summary counts.
    const params = new URLSearchParams(searchParams.toString());
    params.set("deleted", encodeURIComponent(builderName));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  const previewUrl = builderSlug && SITE_URL ? `${SITE_URL}/builders/${builderSlug}` : null;

  return (
    <>
      <div className="inline-flex items-center justify-end gap-0.5">
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="View Builder"
            aria-label="View Builder"
            className={iconButton}
          >
            <Eye className="h-4 w-4" />
          </a>
        ) : (
          <span
            title="This builder has no slug, so it has no public page"
            aria-label="View Builder (unavailable)"
            className={`${iconButton} cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted`}
          >
            <Eye className="h-4 w-4" />
          </span>
        )}

        <Link
          href={`/dashboard/builders/${builderId}/edit`}
          title="Edit Builder"
          aria-label="Edit Builder"
          className={iconButton}
        >
          <Pencil className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setConfirmOpen(true);
          }}
          title="Delete Builder"
          aria-label="Delete Builder"
          className={`${iconButton} hover:bg-red-50 hover:text-red-600`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {confirmOpen &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-left shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-bold text-ink">Delete builder?</h3>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                aria-label="Close"
                className="text-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-sm text-muted">
              This will permanently delete{" "}
              <span className="font-semibold text-ink">&ldquo;{builderName}&rdquo;</span>. This
              action cannot be undone.
            </p>

            {errorMsg && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {errorMsg}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete Builder"}
              </button>
            </div>
          </div>
        </div>
          ,
          document.body,
        )}
    </>
  );
}
