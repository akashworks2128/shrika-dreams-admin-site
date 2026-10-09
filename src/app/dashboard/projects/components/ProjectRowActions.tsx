"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { deleteProjectById } from "@/lib/projects-data";
import { getProjectImageUrls, removeStorageFilesByUrl } from "@/lib/project-images";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-navy";

interface ProjectRowActionsProps {
  projectId: string;
  projectName: string;
  projectSlug: string | null;
}

export default function ProjectRowActions({
  projectId,
  projectName,
  projectSlug,
}: ProjectRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function handleDelete() {
    setDeleting(true);
    setErrorMsg(null);

    const supabase = createClient();

    // Collect the image URLs first: once the project is gone we can no longer
    // look them up, and we want to clean the files out of Storage too.
    const imageUrls = await getProjectImageUrls(supabase, projectId);

    const result = await deleteProjectById(supabase, projectId);

    if (!result.success) {
      setDeleting(false);
      setErrorMsg(result.error ?? "The project could not be deleted.");
      return;
    }

    if (imageUrls.length > 0) {
      const storageError = await removeStorageFilesByUrl(supabase, imageUrls);
      if (storageError) {
        // Project is deleted; orphaned files are harmless, so just log it.
        console.error("[projects] storage cleanup failed:", storageError);
      }
    }

    setDeleting(false);

    setConfirmOpen(false);

    // Preserve current search/filters/page, flag success for the page-level
    // toast, and let the server component re-fetch the list + summary counts.
    const params = new URLSearchParams(searchParams.toString());
    params.set("deleted", encodeURIComponent(projectName));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  // Public project page: <site>/projects/<slug>, using the project's real slug.
  // The public site is a separate app from this admin panel, so set
  // NEXT_PUBLIC_SITE_URL (e.g. https://shrikadreams.com) for View to reach it.
  // Without it we fall back to a relative path, which only works when the
  // public site is served from the same origin as the admin.
  const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const siteUrl = configuredSiteUrl || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  const previewUrl = projectSlug && siteUrl
    ? `${siteUrl}/projects/${encodeURIComponent(projectSlug)}`
    : null;

  return (
    <>
      <div className="inline-flex items-center justify-end gap-0.5">
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="View Project"
            aria-label="View Project"
            className={iconButton}
          >
            <Eye className="h-4 w-4" />
          </a>
        ) : (
          <span
            title="This project has no slug, so it has no public page"
            aria-label="View Project (unavailable)"
            className={`${iconButton} cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted`}
          >
            <Eye className="h-4 w-4" />
          </span>
        )}

        <Link
          href={`/dashboard/projects/${projectId}/edit`}
          title="Edit Project"
          aria-label="Edit Project"
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
          title="Delete Project"
          aria-label="Delete Project"
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
              <h3 className="text-base font-bold text-ink">
                Are you sure you want to delete this project?
              </h3>
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
              <span className="font-semibold text-ink">&ldquo;{projectName}&rdquo;</span>. This
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
                {deleting ? "Deleting…" : "Delete Project"}
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
