"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { slugify } from "@/lib/blog-data";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SlugState = "empty" | "invalid" | "checking" | "available" | "taken" | "error";

/** Lightly cleans typed input (keeps a trailing "-" so hyphens can be typed). */
function sanitize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 80);
}

/** true = another post already uses this slug. Throws on a database error. */
export async function isSlugTaken(slug: string, postId: string): Promise<boolean> {
  const { count, error } = await createClient()
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug)
    .neq("id", postId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

/**
 * Slug field state. For a new post the slug follows the title until the admin
 * edits it by hand; for an existing post the saved slug is kept (so changing
 * the title never silently changes a live URL) until "Regenerate" is used.
 * Availability is checked (debounced) against other posts.
 */
export function useSlugField({
  postId,
  title,
  initialSlug,
}: {
  postId: string;
  title: string;
  initialSlug: string | null;
}) {
  const [manual, setManual] = useState<string | null>(initialSlug);
  const slug = manual ?? (title.trim() ? slugify(title) : "");
  const [check, setCheck] = useState<{ slug: string; state: "available" | "taken" | "error" } | null>(null);

  useEffect(() => {
    if (!slug || !SLUG_PATTERN.test(slug)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let state: "available" | "taken" | "error";
      try {
        state = (await isSlugTaken(slug, postId)) ? "taken" : "available";
      } catch {
        state = "error";
      }
      if (!cancelled) setCheck({ slug, state });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, postId]);

  let state: SlugState;
  if (!slug) state = "empty";
  else if (!SLUG_PATTERN.test(slug)) state = "invalid";
  else state = check?.slug === slug ? check.state : "checking";

  return {
    slug,
    state,
    /** Suggestion when the slug is taken. */
    suggestion: slug ? `${slug}-${postId.slice(0, 4)}` : "",
    setSlug: (value: string) => setManual(sanitize(value)),
    finalize: () => setManual((current) => (current === null ? null : current.replace(/^-+|-+$/g, ""))),
    regenerate: () => setManual(null),
  };
}
