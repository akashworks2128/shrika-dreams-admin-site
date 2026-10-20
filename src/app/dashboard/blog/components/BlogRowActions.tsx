"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { deleteBlogPost } from "@/lib/blog-data";

export default function BlogRowActions({ postId, postTitle }: { postId: string; postTitle: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setErrorMsg(null);

    const result = await deleteBlogPost(createClient(), postId);
    setDeleting(false);

    if (!result.success) {
      setErrorMsg(result.error ?? "Couldn't delete this post.");
      return;
    }

    setConfirmOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("deleted", encodeURIComponent(postTitle));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMsg(null);
          setConfirmOpen(true);
        }}
        title="Delete Post"
        aria-label={`Delete ${postTitle}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {confirmOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-5 text-left shadow-xl">
              <div className="flex items-start justify-between">
                <h3 className="text-base font-bold text-ink">Delete post?</h3>
                <button type="button" onClick={() => setConfirmOpen(false)} aria-label="Close" className="text-muted hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-sm text-muted">
                This will permanently delete <span className="font-semibold text-ink">&ldquo;{postTitle}&rdquo;</span> and its
                uploaded images. This action cannot be undone.
              </p>
              {errorMsg && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errorMsg}</p>}
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
                  {deleting ? "Deleting…" : "Delete Post"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
