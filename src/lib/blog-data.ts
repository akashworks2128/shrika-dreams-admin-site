import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTENT_IMAGES_BUCKET } from "./content-images";

/**
 * SCHEMA — see supabase/migrations/20261010_create_blog_posts.sql
 * blog_posts: id (uuid), title, slug (unique), content (jsonb, Tiptap JSON),
 *             cover_image_url, is_published (bool), created_at, updated_at.
 */

export interface BlogListItem {
  id: string;
  title: string;
  coverImageUrl: string | null;
  published: boolean;
  updatedAt: string;
}

export interface BlogListResult {
  items: BlogListItem[];
  error: string | null;
}

export async function getBlogPosts(
  supabase: SupabaseClient,
  search: string,
): Promise<BlogListResult> {
  try {
    let query = supabase
      .from("blog_posts")
      .select("id, title, cover_image_url, is_published, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (search) {
      const term = search.replace(/[%,_\\]/g, "\\$&");
      query = query.ilike("title", `%${term}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[blog-data] getBlogPosts failed:", error.message);
      return { items: [], error: error.message };
    }

    return {
      items: (data ?? []).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        coverImageUrl: (row.cover_image_url as string | null) ?? null,
        published: Boolean(row.is_published),
        updatedAt: row.updated_at as string,
      })),
      error: null,
    };
  } catch (err) {
    console.error("[blog-data] getBlogPosts threw:", err);
    return { items: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}

/** Deletes a post row, then best-effort removes its uploaded images. */
export async function deleteBlogPost(
  supabase: SupabaseClient,
  id: string,
): Promise<{ success: boolean; error?: string }> {
  // .select("id") so a delete that RLS silently blocked (0 rows) is reported instead of shown as success.
  const { data: removed, error } = await supabase.from("blog_posts").delete().eq("id", id).select("id");
  if (error) return { success: false, error: error.message };
  if (!removed || removed.length === 0) {
    return { success: false, error: "The post was not deleted. It may already be gone, or your account may not have permission." };
  }

  try {
    const folder = `blog/${id}`;
    const { data: files } = await supabase.storage.from(CONTENT_IMAGES_BUCKET).list(folder, { limit: 1000 });
    if (files && files.length > 0) {
      await supabase.storage.from(CONTENT_IMAGES_BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
    }
  } catch (err) {
    console.error("[blog-data] image cleanup failed:", err);
  }
  return { success: true };
}
