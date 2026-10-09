import type { SupabaseClient } from "@supabase/supabase-js";

export const CONTENT_IMAGES_BUCKET = "project-images";
export const CONTENT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const CONTENT_ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const CONTENT_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateContentImageFile(file: File): string | null {
  if (!(CONTENT_ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `"${file.name}" is not a supported image. Please use JPG, PNG or WebP.`;
  }
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > CONTENT_MAX_IMAGE_BYTES) {
    return `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The maximum size is 5 MB.`;
  }
  return null;
}

export async function uploadContentImage(
  supabase: SupabaseClient,
  entityType: "localities" | "builders",
  entityId: string,
  field: string,
  file: File,
): Promise<{ url?: string; path?: string; error?: string }> {
  const validationError = validateContentImageFile(file);
  if (validationError) return { error: validationError };

  const ext = EXTENSION_BY_MIME[file.type] ?? "jpg";
  const path = `${entityType}/${entityId}/${field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(CONTENT_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });

  if (error) return { error: `Upload failed for "${file.name}": ${error.message}` };

  const { data } = supabase.storage.from(CONTENT_IMAGES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export function contentStoragePathFromUrl(url: string): string | null {
  const marker = `/${CONTENT_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1 || !url.includes("/storage/v1/object/")) return null;
  const path = url.slice(idx + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

export async function removeContentImageByUrl(
  supabase: SupabaseClient,
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  const path = contentStoragePathFromUrl(url);
  if (!path) return null;
  const { error } = await supabase.storage.from(CONTENT_IMAGES_BUCKET).remove([path]);
  return error?.message ?? null;
}
