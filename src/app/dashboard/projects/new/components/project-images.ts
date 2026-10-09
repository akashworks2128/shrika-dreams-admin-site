import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SCHEMA NOTE
 * ---------------------------------------------------------------------------
 * `project_images` columns used here (unchanged, pre-existing):
 *   id, project_id, image_url, image_type, alt_text, sort_order
 *
 * There is no `is_hero` column. The hero/main image is the row whose
 * `image_type` equals "hero" (case-insensitive) — the same convention
 * already used for reading images in lib/projects-data.ts. Every other
 * uploaded image is stored with image_type "gallery".
 *
 * Storage bucket: "project-images" (public bucket). Files are stored under
 * `{project-id}/{timestamp}-{random}.{ext}` so re-uploads never collide and
 * every file can be traced back to its project.
 */

export const PROJECT_IMAGES_BUCKET = "project-images";
export const HERO_IMAGE_TYPE = "Hero";
export const GALLERY_IMAGE_TYPE = "Gallery";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

// Supabase's default project-wide Storage upload limit is 50MB, but that's
// far more than a web listing photo needs. 5MB keeps page weight sane and
// comfortably inside that ceiling.
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export interface ProjectImageRecord {
  id: string;
  projectId: string;
  imageUrl: string;
  imageType: string;
  altText: string | null;
  sortOrder: number;
}

/**
 * One image slot in the Add/Edit Project form. A slot can be:
 *  - "existing": already saved in `project_images` (loaded on Edit)
 *  - "new": a local file picked by the admin, not yet uploaded
 *
 * `previewUrl` is always safe to render (existing public URL, or a local
 * object URL for a freshly picked file).
 */
export interface ProjectImageSlot {
  key: string; // stable React key; existing row id, or a generated local id
  kind: "existing" | "new";
  imageType: typeof HERO_IMAGE_TYPE | typeof GALLERY_IMAGE_TYPE;
  previewUrl: string;
  altText: string;
  sortOrder: number;
  existingId?: string; // project_images.id, present for "existing"
  existingUrl?: string; // project_images.image_url, present for "existing"
  file?: File; // present for "new"
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "Unsupported file type. Please upload a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Image is too large. Maximum size is ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.`;
  }
  return null;
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Loads existing images for a project (used by the Edit form) and converts
 * them into form-ready slots, hero first, then gallery by sort_order.
 */
export function imagesToSlots(
  images: {
    id: string;
    image_url: string;
    image_type: string | null;
    alt_text: string | null;
    sort_order: number | null;
  }[]
): ProjectImageSlot[] {
  return [...images]
    .sort((a, b) => {
      const aHero = (a.image_type ?? "").toLowerCase() === HERO_IMAGE_TYPE.toLowerCase();
      const bHero = (b.image_type ?? "").toLowerCase() === HERO_IMAGE_TYPE.toLowerCase();
      if (aHero && !bHero) return -1;
      if (!aHero && bHero) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .map((img, index) => ({
      key: img.id,
      kind: "existing" as const,
      imageType:
        (img.image_type ?? "").toLowerCase() === HERO_IMAGE_TYPE.toLowerCase()
          ? HERO_IMAGE_TYPE
          : GALLERY_IMAGE_TYPE,
      previewUrl: img.image_url,
      altText: img.alt_text ?? "",
      sortOrder: img.sort_order ?? index,
      existingId: img.id,
      existingUrl: img.image_url,
    }));
}

export function newSlotFromFile(file: File, sortOrder: number): ProjectImageSlot {
  return {
    key: `new-${randomId()}`,
    kind: "new",
    imageType: GALLERY_IMAGE_TYPE,
    previewUrl: URL.createObjectURL(file),
    altText: "",
    sortOrder,
    file,
  };
}

/**
 * Uploads any "new" slots to Storage, then fully replaces the project's rows
 * in `project_images` with the final set (existing rows that are kept, plus
 * newly-uploaded ones). This is simpler and safer than trying to diff
 * individual inserts/updates/deletes, and still satisfies "don't lose
 * existing images on unrelated edits" because untouched slots are passed
 * straight through.
 *
 * Any slot removed from the local list beforehand (via removeSlot in the
 * form) is handled separately by deleteRemovedImages, so its Storage file
 * and DB row are cleaned up even if the project save never gets this far.
 */
export async function saveProjectImages(
  supabase: SupabaseClient,
  projectId: string,
  slots: ProjectImageSlot[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const finalRows: {
      project_id: string;
      image_url: string;
      image_type: string;
      alt_text: string | null;
      sort_order: number;
    }[] = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];

      if (slot.kind === "existing" && slot.existingUrl) {
        finalRows.push({
          project_id: projectId,
          image_url: slot.existingUrl,
          image_type: slot.imageType,
          alt_text: slot.altText.trim() || null,
          sort_order: i,
        });
        continue;
      }

      if (slot.kind === "new" && slot.file) {
        const ext = extensionFor(slot.file);
        const path = `${projectId}/${Date.now()}-${randomId()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(PROJECT_IMAGES_BUCKET)
          .upload(path, slot.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: slot.file.type,
          });

        if (uploadError) {
          return {
            success: false,
            error: `Failed to upload "${slot.file.name}": ${uploadError.message}`,
          };
        }

        const { data: publicUrlData } = supabase.storage
          .from(PROJECT_IMAGES_BUCKET)
          .getPublicUrl(path);

        finalRows.push({
          project_id: projectId,
          image_url: publicUrlData.publicUrl,
          image_type: slot.imageType,
          alt_text: slot.altText.trim() || null,
          sort_order: i,
        });
      }
    }

    // Replace the project's image rows atomically-enough for this use case:
    // delete what's there, then insert the final set. Existing rows that
    // were kept are re-inserted with their same image_url, so no files are
    // lost — only their row ids change.
    const { error: deleteError } = await supabase
      .from("project_images")
      .delete()
      .eq("project_id", projectId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    if (finalRows.length > 0) {
      const { error: insertError } = await supabase.from("project_images").insert(finalRows);

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error while saving images.",
    };
  }
}

/**
 * Best-effort removal of a single image's Storage file when the admin
 * explicitly removes it from the Edit form. Failures here are logged but
 * non-fatal — the project_images row is the source of truth and is already
 * gone from the in-memory slot list; saveProjectImages will not re-create it.
 */
export async function deleteStorageFileForUrl(
  supabase: SupabaseClient,
  imageUrl: string
): Promise<void> {
  try {
    const marker = `/object/public/${PROJECT_IMAGES_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) return;

    const path = imageUrl.slice(idx + marker.length);
    if (!path) return;

    const { error } = await supabase.storage.from(PROJECT_IMAGES_BUCKET).remove([path]);
    if (error) {
      console.error("[project-images] failed to remove storage file:", error.message);
    }
  } catch (err) {
    console.error("[project-images] deleteStorageFileForUrl threw:", err);
  }
}
