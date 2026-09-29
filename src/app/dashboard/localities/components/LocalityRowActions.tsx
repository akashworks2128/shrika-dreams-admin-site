"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Pencil, ExternalLink, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface LocalityRowActionsProps {
  localityId: string;
  localityName: string;
  localitySlug: string | null;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export default function LocalityRowActions({
  localityId,
  localityName,
  localitySlug,
}: LocalityRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleDelete() {
    // `deleting` guards this from firing twice (e.g. a fast double click),
    // since the confirm button is disabled while it's true.
    if (deleting) return;
    setDeleting(true);
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.from("localities").delete().eq("id", localityId);

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
    params.set("deleted", encodeURIComponent(localityName));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  const previewUrl = localitySlug && SITE_URL ? `${SITE_URL}/localities/${localitySlug}` : null;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Row actions"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {open && (
          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
            <Link
              href={`/dashboard/localities/${localityId}/edit`}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              <Pencil className="h-3.5 w-3.5 text-muted" />
              Edit
            </Link>

            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted" />
                View
              </a>
            ) : (
              <span className="flex cursor-not-allowed items-center gap-2.5 px-3 py-2 text-sm text-gray-300">
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-bold text-ink">Delete locality?</h3>
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
              <span className="font-semibold text-ink">&ldquo;{localityName}&rdquo;</span>. This
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
                {deleting ? "Deleting…" : "Delete Locality"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
