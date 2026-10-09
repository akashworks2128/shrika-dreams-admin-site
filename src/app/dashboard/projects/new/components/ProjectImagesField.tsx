"use client";

import { useRef, useState } from "react";
import { ImagePlus, RefreshCw, Star, Trash2 } from "lucide-react";
import ErrorToast from "@/app/dashboard/components/ErrorToast";
import {
  ACCEPT_ATTRIBUTE,
  GALLERY_IMAGE_TYPE,
  MAX_IMAGES_PER_PROJECT,
  MAX_IMAGE_BYTES,
  newImageKey,
  validateImageFile,
  type ProjectImageItem,
  type RemovedProjectImage,
} from "@/lib/project-images";

interface ProjectImagesFieldProps {
  items: ProjectImageItem[];
  onItemsChange: (items: ProjectImageItem[]) => void;
  /** Called when an already-saved image is removed or replaced. */
  onRemoveSaved: (removed: RemovedProjectImage) => void;
  disabled?: boolean;
}

export default function ProjectImagesField({
  items,
  onItemsChange,
  onRemoveSaved,
  disabled,
}: ProjectImagesFieldProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceKeyRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function releasePreview(item: ProjectImageItem) {
    if (item.file) URL.revokeObjectURL(item.url);
  }

  function handleAddFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const errors: string[] = [];
    const accepted: ProjectImageItem[] = [];
    const room = MAX_IMAGES_PER_PROJECT - items.length;

    Array.from(fileList).forEach((file) => {
      const problem = validateImageFile(file);
      if (problem) {
        errors.push(problem);
        return;
      }
      if (accepted.length >= room) {
        errors.push(`You can add up to ${MAX_IMAGES_PER_PROJECT} images per project.`);
        return;
      }
      accepted.push({
        key: newImageKey(),
        url: URL.createObjectURL(file),
        file,
        imageType: GALLERY_IMAGE_TYPE,
        altText: "",
        isHero: false,
      });
    });

    if (errors.length > 0) setError(Array.from(new Set(errors)).join(" "));

    if (accepted.length > 0) {
      const next = [...items, ...accepted];
      // First image ever added becomes the hero.
      if (!next.some((i) => i.isHero)) next[0] = { ...next[0], isHero: true };
      onItemsChange(next);
    }
  }

  function handleReplaceFile(fileList: FileList | null) {
    const key = replaceKeyRef.current;
    replaceKeyRef.current = null;
    if (!fileList || fileList.length === 0 || !key) return;

    const file = fileList[0];
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    const target = items.find((i) => i.key === key);
    if (!target) return;

    if (target.id) onRemoveSaved({ id: target.id, url: target.url });
    releasePreview(target);

    onItemsChange(
      items.map((i) =>
        i.key === key
          ? {
              key: newImageKey(),
              url: URL.createObjectURL(file),
              file,
              imageType: i.isHero ? i.imageType : GALLERY_IMAGE_TYPE,
              altText: i.altText,
              isHero: i.isHero,
            }
          : i
      )
    );
  }

  function handleRemove(item: ProjectImageItem) {
    setError(null);
    if (item.id) onRemoveSaved({ id: item.id, url: item.url });
    releasePreview(item);

    const next = items.filter((i) => i.key !== item.key);
    // Removing the hero promotes the next image.
    if (item.isHero && next.length > 0 && !next.some((i) => i.isHero)) {
      next[0] = { ...next[0], isHero: true };
    }
    onItemsChange(next);
  }

  function handleSetHero(key: string) {
    onItemsChange(items.map((i) => ({ ...i, isHero: i.key === key })));
  }

  const atLimit = items.length >= MAX_IMAGES_PER_PROJECT;

  return (
    <>
      <ErrorToast message={error} onDismiss={() => setError(null)} />
      <div>
      <input
        ref={addInputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        className="hidden"
        onChange={(e) => {
          handleAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(e) => {
          handleReplaceFile(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.key}
            className={`group relative overflow-hidden rounded-xl border bg-surface ${
              item.isHero ? "border-gold" : "border-line"
            }`}
          >
            <div className="aspect-[4/3] w-full">
              {/* Plain <img>: previews are blob: URLs and saved URLs can be any host. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.altText || "Project image"}
                className="h-full w-full object-cover"
              />
            </div>

            {item.isHero && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-white">
                <Star className="h-3 w-3 fill-white" />
                Hero
              </span>
            )}
            {item.file && (
              <span className="absolute right-2 top-2 rounded-full bg-navy/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                Not saved yet
              </span>
            )}

            <div className="flex items-center justify-between gap-1 border-t border-line bg-white px-2 py-1.5">
              <button
                type="button"
                disabled={disabled || item.isHero}
                onClick={() => handleSetHero(item.key)}
                title="Set as hero image"
                aria-label="Set as hero image"
                className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold text-muted hover:bg-surface hover:text-gold disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
              >
                <Star className="h-3.5 w-3.5" />
                Hero
              </button>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    replaceKeyRef.current = item.key;
                    replaceInputRef.current?.click();
                  }}
                  title="Replace image"
                  aria-label="Replace image"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink disabled:opacity-40"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRemove(item)}
                  title="Remove image"
                  aria-label="Remove image"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {!atLimit && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => addInputRef.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-surface px-3 text-center transition-colors hover:border-gold hover:bg-gold-light/10 disabled:opacity-50 sm:aspect-auto sm:min-h-[8.5rem]"
          >
            <ImagePlus className="h-6 w-6 text-gold" />
            <span className="text-sm font-semibold text-ink">
              {items.length === 0 ? "Upload Image" : "Add more"}
            </span>
            <span className="text-[11px] text-muted">
              JPG, PNG or WebP · up to {MAX_IMAGE_BYTES / (1024 * 1024)} MB
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        The hero image is shown first on the listing and project page. Images are uploaded when
        you save the project.
      </p>
    </div>
    </>
  );
}
