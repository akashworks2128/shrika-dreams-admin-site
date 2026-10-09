import type { SupabaseClient } from "@supabase/supabase-js";
import { HERO_IMAGE_TYPE } from "@/lib/projects-data";

/**
 * Project image service — the ONLY place that talks to Supabase Storage for
 * project images and writes `project_images` rows.
 *
 * Uses the existing `project_images` schema:
 *   id, project_id, image_url, image_type, alt_text, sort_order
 * The hero image is the row whose image_type is "hero" (HERO_IMAGE_TYPE, the
 * same convention projects-data.ts uses). There is no is_hero column.
 *
 * Files are stored at `{bucket}/{project-id}/{timestamp}-{random}.{ext}`.
 */

// Change this single constant if your existing bucket has a different name.
export const PROJECT_IMAGES_BUCKET = "project-images";

export const GALLERY_IMAGE_TYPE = "Gallery";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGES_PER_PROJECT = 12;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** One image in the form. Existing images have `id`; new ones have `file`. */
export interface ProjectImageItem {
  key: string; // stable React key
  id?: string; // project_images.id (existing rows only)
  url: string; // saved URL, or a blob: preview URL for a new file
  file?: File; // present only for images not yet uploaded
  imageType: string;
  altText: string;
  isHero: boolean;
}

/** An existing image the admin removed; deleted from DB + Storage on save. */
export interface RemovedProjectImage {
  id: string;
  url: string;
}

export function validateImageFile(file: File): string | null {
  const okType = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
  if (!okType) {
    return `"${file.name}" is not a supported image. Please use JPG, PNG or WebP.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" is ${mb} MB. The maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`;
  }
  if (file.size === 0) {
    return `"${file.name}" is empty.`;
  }
  return null;
}

export function newImageKey(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Maps a `project_images` row (as returned by Supabase) to a form item. */
export function rowToImageItem(row: {
  id: string;
  image_url: string;
  image_type: string | null;
  alt_text: string | null;
  sort_order: number | null;
}): ProjectImageItem {
  const type = row.image_type ?? GALLERY_IMAGE_TYPE;
  return {
    key: row.id,
    id: row.id,
    url: row.image_url,
    imageType: type,
    altText: row.alt_text ?? "",
    isHero: type.toLowerCase() === HERO_IMAGE_TYPE.toLowerCase(),
  };
}

/** Sorts rows hero-first, then by sort_order, matching projects-data.ts. */
export function rowsToImageItems(
  rows:
    | {
        id: string;
        image_url: string;
        image_type: string | null;
        alt_text: string | null;
        sort_order: number | null;
      }[]
    | null
    | undefined
): ProjectImageItem[] {
  const sorted = [...(rows ?? [])].sort((a, b) => {
    const aHero = (a.image_type ?? "").toLowerCase() === HERO_IMAGE_TYPE.toLowerCase();
    const bHero = (b.image_type ?? "").toLowerCase() === HERO_IMAGE_TYPE.toLowerCase();
    if (aHero && !bHero) return -1;
    if (!aHero && bHero) return 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const items = sorted.map(rowToImageItem);
  // Exactly one hero: keep the first flagged one, or fall back to the first image.
  let heroSeen = false;
  for (const item of items) {
    if (item.isHero && !heroSeen) heroSeen = true;
    else item.isHero = false;
  }
  if (!heroSeen && items.length > 0) items[0].isHero = true;
  return items;
}

/** Extracts the storage object path from a public URL of our bucket, or null. */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/${PROJECT_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1 || !url.includes("/storage/v1/object/")) return null;
  const path = url.slice(idx + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/** Best-effort removal of storage files for the given image URLs. */
export async function removeStorageFilesByUrl(
  supabase: SupabaseClient,
  urls: string[]
): Promise<string | null> {
  const paths = urls
    .map(storagePathFromUrl)
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return null;
  const { error } = await supabase.storage.from(PROJECT_IMAGES_BUCKET).remove(paths);
  return error ? error.message : null;
}

async function uploadFile(
  supabase: SupabaseClient,
  projectId: string,
  file: File
): Promise<{ url?: string; path?: string; error?: string }> {
  const ext = EXTENSION_BY_MIME[file.type] ?? "jpg";
  const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(PROJECT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("bucket not found")) {
      return {
        error: `Image storage is not configured yet. The "project-images" storage bucket is missing. Run the supplied Supabase project-image storage setup once, then save again.`,
      };
    }
    return { error: `Upload failed for "${file.name}": ${error.message}` };
  }

  const { data } = supabase.storage.from(PROJECT_IMAGES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export interface SyncImagesResult {
  success: boolean;
  error?: string;
  /**
   * Items after saving. New files that were saved are replaced by their saved
   * rows; on failure, items that were not processed yet stay as pending files
   * so a retry never duplicates images that already uploaded.
   */
  items?: ProjectImageItem[];
  /** True once the removals have been applied (so they are not retried). */
  removalsDone: boolean;
}

/**
 * Persists the form's image state for a project:
 *  1. removes deleted images (DB row, then Storage file)
 *  2. uploads new files and inserts their rows
 *  3. updates sort_order / hero flag on existing rows
 *
 * Images the admin did not touch are never deleted, so editing unrelated
 * project fields keeps all existing images.
 */
export async function syncProjectImages(
  supabase: SupabaseClient,
  projectId: string,
  items: ProjectImageItem[],
  removed: RemovedProjectImage[]
): Promise<SyncImagesResult> {
  // 1. Removals
  if (removed.length > 0) {
    const { error } = await supabase
      .from("project_images")
      .delete()
      .in(
        "id",
        removed.map((r) => r.id)
      );
    if (error) {
      return {
        success: false,
        error: `Could not remove image: ${error.message}`,
        removalsDone: false,
      };
    }
    const storageError = await removeStorageFilesByUrl(
      supabase,
      removed.map((r) => r.url)
    );
    if (storageError) {
      // The DB rows are gone; an orphaned file is harmless, so only log it.
      console.error("[project-images] storage cleanup failed:", storageError);
    }
  }

  // Exactly one hero among the remaining images.
  const hasHero = items.some((i) => i.isHero);
  const normalized = items.map((item, index) => ({
    ...item,
    isHero: hasHero ? item.isHero : index === 0,
  }));

  const saved: ProjectImageItem[] = [];

  for (let index = 0; index < normalized.length; index++) {
    const item = normalized[index];
    const imageType = item.isHero
      ? HERO_IMAGE_TYPE
      : item.imageType.toLowerCase() === HERO_IMAGE_TYPE.toLowerCase()
        ? GALLERY_IMAGE_TYPE
        : item.imageType || GALLERY_IMAGE_TYPE;

    if (item.file) {
      // 2. New upload
      const uploaded = await uploadFile(supabase, projectId, item.file);
      if (uploaded.error || !uploaded.url || !uploaded.path) {
        return {
          success: false,
          error: uploaded.error ?? "Upload failed.",
          items: [...saved, ...normalized.slice(index)],
          removalsDone: true,
        };
      }

      const { data, error } = await supabase
        .from("project_images")
        .insert({
          project_id: projectId,
          image_url: uploaded.url,
          image_type: imageType,
          alt_text: item.altText.trim() || null,
          sort_order: index,
        })
        .select("id")
        .single();

      if (error || !data) {
        // Don't leave an unreferenced file behind.
        await supabase.storage.from(PROJECT_IMAGES_BUCKET).remove([uploaded.path]);
        return {
          success: false,
          error: `Could not save image record: ${error?.message ?? "unknown error"}`,
          items: [...saved, ...normalized.slice(index)],
          removalsDone: true,
        };
      }

      saved.push({
        key: data.id as string,
        id: data.id as string,
        url: uploaded.url,
        imageType,
        altText: item.altText,
        isHero: item.isHero,
      });
    } else if (item.id) {
      // 3. Existing row — only write when something actually changed.
      const { error } = await supabase
        .from("project_images")
        .update({ image_type: imageType, sort_order: index })
        .eq("id", item.id);
      if (error) {
        return {
          success: false,
          error: `Could not update image: ${error.message}`,
          items: [...saved, ...normalized.slice(index)],
          removalsDone: true,
        };
      }
      saved.push({ ...item, imageType, isHero: item.isHero });
    }
  }

  return { success: true, items: saved, removalsDone: true };
}

/** Looks up the image URLs of a project (used to clean Storage on delete). */
export async function getProjectImageUrls(
  supabase: SupabaseClient,
  projectId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_images")
    .select("image_url")
    .eq("project_id", projectId);
  if (error) {
    console.error("[project-images] could not list images:", error.message);
    return [];
  }
  return (data ?? []).map((r: { image_url: string }) => r.image_url);
}
