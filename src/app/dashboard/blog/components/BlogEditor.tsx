"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import DashboardHeader from "@/app/dashboard/components/DashboardHeader";
import ErrorToast from "@/app/dashboard/components/ErrorToast";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase";
import {
  CONTENT_ACCEPT_ATTRIBUTE,
  contentStoragePathFromUrl,
  removeContentImageByUrl,
  uploadContentImage,
  validateContentImageFile,
} from "@/lib/content-images";
import { getBlogExtensions } from "./blog-extensions";
import EditorToolbar from "./EditorToolbar";
import type { GalleryImage } from "./gallery-extension";
import SettingsPanel from "./SettingsPanel";
import { isSlugTaken, SLUG_PATTERN, useSlugField } from "./use-slug-field";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
const TITLE_MAX = 200;

export interface BlogEditorInitial {
  id: string;
  title: string;
  content: JSONContent;
  published: boolean;
  slug: string | null;
  coverImageUrl: string | null;
  publishDate: string | null; // YYYY-MM-DD
  excerpt: JSONContent | null;
}

const DESKTOP_QUERY = "(min-width: 1024px)";
function subscribeDesktop(callback: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/** Today as YYYY-MM-DD in India time (matches the admin's timezone). */
function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Turns a database error into a message the admin can act on. */
function friendlyDbError(err: { message: string; code?: string }): string {
  if (/blog_posts_pkey/i.test(err.message)) {
    return "This post was already saved. Please return to the Blog list and refresh.";
  }
  if (err.code === "23505" || /duplicate key|blog_posts_slug_key/i.test(err.message)) {
    return "That slug is already used by another post. Choose a different slug in Settings.";
  }
  if (/excerpt|publish_date/i.test(err.message) && /column|schema cache/i.test(err.message)) {
    return "The blog_posts table is missing the new Settings columns. Run the 20261013_blog_posts_settings.sql script in the Supabase SQL Editor, then try again.";
  }
  return err.message;
}

/** First image (or first gallery image) in the article, used as the list cover. */
function findCoverImage(node: JSONContent | undefined): string | null {
  if (!node) return null;
  if (node.type === "image" && typeof node.attrs?.src === "string") return node.attrs.src;
  if (node.type === "gallery") {
    const first = (node.attrs?.images as GalleryImage[] | undefined)?.[0];
    if (first?.src) return first.src;
  }
  for (const child of node.content ?? []) {
    const found = findCoverImage(child);
    if (found) return found;
  }
  return null;
}

/**
 * Word count, reading time and the first image for the Settings panel.
 * Debounced, and it walks the document with an early exit instead of serialising the
 * whole article on every keystroke, so typing stays fast in long posts.
 */
function useEditorStats(editor: Editor | null) {
  const [stats, setStats] = useState<{ words: number; minutes: number; firstImage: string | null }>({
    words: 0,
    minutes: 1,
    firstImage: null,
  });

  useEffect(() => {
    if (!editor) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const compute = () => {
      const text = editor.getText().trim();
      const words = text ? text.split(/\s+/).length : 0;
      let firstImage: string | null = null;
      editor.state.doc.descendants((node) => {
        if (firstImage) return false;
        if (node.type.name === "image" && typeof node.attrs.src === "string") {
          firstImage = node.attrs.src;
        } else if (node.type.name === "gallery") {
          const first = (node.attrs.images as GalleryImage[] | undefined)?.[0];
          if (first?.src) firstImage = first.src;
        }
        return !firstImage;
      });
      const minutes = Math.max(1, Math.ceil(words / 200));
      setStats((prev) =>
        prev.words === words && prev.minutes === minutes && prev.firstImage === firstImage
          ? prev
          : { words, minutes, firstImage },
      );
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(compute, 300);
    };

    schedule(); // initial value, asynchronously
    editor.on("update", schedule);
    return () => {
      clearTimeout(timer);
      editor.off("update", schedule);
    };
  }, [editor]);

  return stats;
}

export default function BlogEditor({ initial }: { initial?: BlogEditorInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [postId] = useState(() => initial?.id ?? crypto.randomUUID());
  const [title, setTitle] = useState(initial?.title ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const saveLock = useRef(false); // blocks a second click before React re-renders
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [initialFirstImage] = useState(() => findCoverImage(initial?.content));
  const [featuredUrl, setFeaturedUrl] = useState<string | null>(
    initial?.coverImageUrl && initial.coverImageUrl !== initialFirstImage ? initial.coverImageUrl : null,
  );
  const [autoCover, setAutoCover] = useState<boolean>(
    !initial
      ? true
      : initial.coverImageUrl === null
        ? initialFirstImage === null
        : initial.coverImageUrl === initialFirstImage,
  );
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [publishDate, setPublishDate] = useState(() => initial?.publishDate ?? todayIso());
  const excerptRef = useRef<JSONContent | null>(initial?.excerpt ?? null);
  const staleFeaturedUrls = useRef<string[]>([]); // removed from storage only after a successful save
  const slugField = useSlugField({ postId, title, initialSlug: initial?.slug ?? null });

  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
  const [panelPref, setPanelPref] = useState<boolean | null>(null);
  const panelOpen = panelPref ?? isDesktop;

  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: getBlogExtensions(),
    content: initial?.content ?? EMPTY_DOC,
    immediatelyRender: false, // avoids SSR hydration mismatch in Next.js
    editorProps: {
      attributes: { class: "blog-prose", "aria-label": "Article content" },
    },
  });

  const stats = useEditorStats(editor);

  async function handleFeaturedFile(file: File) {
    const invalid = validateContentImageFile(file);
    if (invalid) return setError(invalid);
    setFeaturedUploading(true);
    const result = await uploadContentImage(createClient(), "blog", postId, "featured", file);
    setFeaturedUploading(false);
    if (result.error || !result.url) return setError(result.error ?? "Featured image upload failed.");
    if (featuredUrl) staleFeaturedUrls.current.push(featuredUrl);
    setFeaturedUrl(result.url);
  }

  function handleFeaturedRemove() {
    if (featuredUrl) staleFeaturedUrls.current.push(featuredUrl);
    setFeaturedUrl(null);
    setAutoCover(false); // "Remove" means no cover at all, not the first article image
  }

  async function handleImageFile(files: FileList | null) {
    const file = files?.[0];
    if (imageInput.current) imageInput.current.value = "";
    if (!file || !editor) return;
    const invalid = validateContentImageFile(file);
    if (invalid) return setError(invalid);

    setUploading(true);
    const result = await uploadContentImage(createClient(), "blog", postId, "image", file);
    setUploading(false);
    if (result.error || !result.url) return setError(result.error ?? "Image upload failed.");
    editor.chain().focus().setImage({ src: result.url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
  }

  async function handleGalleryFiles(files: FileList | null) {
    const list = files ? Array.from(files) : [];
    if (galleryInput.current) galleryInput.current.value = "";
    if (list.length === 0 || !editor) return;
    if (list.length < 2) return setError("Select at least 2 images to create a gallery.");
    const invalid = list.map(validateContentImageFile).find(Boolean);
    if (invalid) return setError(invalid);

    setUploading(true);
    const supabase = createClient();
    const images: GalleryImage[] = [];
    const failures: string[] = [];
    for (const file of list) {
      const result = await uploadContentImage(supabase, "blog", postId, "gallery", file);
      if (result.url) images.push({ src: result.url, alt: file.name.replace(/\.[^.]+$/, "") });
      else failures.push(result.error ?? `Upload failed for "${file.name}".`);
    }
    setUploading(false);

    if (images.length > 0) editor.chain().focus().insertGallery(images).run();
    if (failures.length > 0) {
      setError(
        `${failures.length} of ${list.length} images failed to upload. ${failures[0]}${
          images.length > 0 ? " The gallery was created with the images that succeeded." : ""
        }`,
      );
    }
  }

  async function handleSave(mode: "draft" | "publish") {
    if (saveLock.current || saving || uploading || featuredUploading || !editor) return;
    setError(null);
    setNotice(null);

    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("A title is required.");
      return;
    }
    if (trimmed.length > TITLE_MAX) {
      setTitleError(`Title must be ${TITLE_MAX} characters or fewer.`);
      return;
    }
    setTitleError(null);

    if (mode === "publish" && editor.isEmpty) {
      setError("Add some content before publishing.");
      return;
    }

    const slug = slugField.slug.replace(/^-+|-+$/g, "");
    if (!slug || !SLUG_PATTERN.test(slug)) {
      setPanelPref(true);
      setError("Enter a valid slug in Settings (lowercase letters, numbers and hyphens).");
      return;
    }

    saveLock.current = true;
    setSaving(mode);
    let saved = false;
    try {
      const supabase = createClient();
      if (await isSlugTaken(slug, postId)) {
        setPanelPref(true);
        throw new Error("That slug is already used by another post. Choose a different slug in Settings.");
      }

      const content = editor.getJSON();
      const cover = featuredUrl ?? (autoCover ? findCoverImage(content) : null);
      const payload = {
        title: trimmed,
        slug,
        content,
        cover_image_url: cover,
        excerpt: excerptRef.current,
        publish_date: publishDate || todayIso(),
        is_published: mode === "publish",
      };

      // .select("id") so a write that RLS silently blocked (0 rows) is reported, not shown as saved.
      const { data: written, error: dbError } = isEdit
        ? await supabase.from("blog_posts").update(payload).eq("id", postId).select("id")
        : await supabase.from("blog_posts").insert({ id: postId, ...payload }).select("id");
      if (dbError) throw new Error(friendlyDbError(dbError));
      if (!written || written.length === 0) {
        throw new Error(
          isEdit
            ? "The post could not be updated. It may have been deleted, or your account may not have permission."
            : "The post was not saved. Your account may not have permission to create posts.",
        );
      }
      saved = true;

      // Saved: now it is safe to delete replaced/removed featured images from storage.
      for (const url of staleFeaturedUrls.current) {
        if (url !== cover && contentStoragePathFromUrl(url)?.includes("/featured-")) {
          await removeContentImageByUrl(supabase, url);
        }
      }
      staleFeaturedUrls.current = [];

      // Publish, Update and Save Draft all go back to the Blog list (refresh so it shows the latest data).
      router.push("/dashboard/blog");
      router.refresh();
    } catch (err) {
      setError(`Couldn't save the post: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      // After a successful save keep the buttons disabled while navigating to the list,
      // so a late click cannot submit the post a second time.
      if (!saved) {
        saveLock.current = false;
        setSaving(null);
      }
    }
  }

  const busy = saving !== null || uploading || featuredUploading;

  return (
    <>
      <DashboardHeader
        title={isEdit ? "Edit Post" : "Add Post"}
        subtitle={isEdit ? "Update this blog post." : "Write a new blog post for the Shrika Dreams website."}
        adminName={ADMIN_DISPLAY_NAME}
        backHref="/dashboard/blog"
        action={
          <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={() => router.push("/dashboard/blog")}
              disabled={busy}
              className="min-w-0 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50 sm:px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={busy}
              title={initial?.published ? "Save as a draft and remove this post from the public website" : "Save without publishing"}
              className="flex min-w-0 items-center justify-center gap-2 rounded-lg border border-gold px-3 py-2.5 text-sm font-semibold text-gold hover:bg-gold-light/20 disabled:opacity-50 sm:px-4"
            >
              {saving === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial?.published ? "Unpublish" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("publish")}
              disabled={busy}
              className="flex min-w-0 items-center justify-center gap-2 rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 sm:px-4"
            >
              {saving === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial?.published ? "Update" : "Publish"}
            </button>
          </div>
        }
      />

      <main className="flex-1 px-4 pb-12 pt-5 sm:px-6 md:px-8">
        <div className={`mx-auto grid max-w-[1400px] gap-6 ${panelOpen ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
          <div className="min-w-0 space-y-5">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <label htmlFor="blog-title" className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
                Post title
              </label>
              <input
                id="blog-title"
                type="text"
                value={title}
                maxLength={TITLE_MAX + 20}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError(null);
                }}
                placeholder="Give your article a title…"
                aria-invalid={Boolean(titleError)}
                className="mt-2 w-full border-0 border-b border-line bg-transparent px-0 pb-3 text-2xl font-bold tracking-tight text-navy outline-none transition-colors placeholder:font-normal placeholder:text-gray-300 focus:border-gold sm:text-3xl"
              />
              {titleError && <p className="mt-2 text-xs text-red-600">{titleError}</p>}
            </div>

            <div className="blog-editor overflow-clip rounded-2xl border border-line bg-white shadow-sm">
              {editor ? (
                <EditorToolbar
                  editor={editor}
                  uploading={uploading}
                  onPickImage={() => imageInput.current?.click()}
                  onPickGallery={() => galleryInput.current?.click()}
                  settingsOpen={panelOpen}
                  onToggleSettings={() => setPanelPref(!panelOpen)}
                />
              ) : (
                <div className="h-[53px] border-b border-line bg-surface/60" aria-hidden="true" />
              )}
              {uploading && (
                <p className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2 text-xs text-muted" role="status">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading images…
                </p>
              )}
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="flex min-h-[520px] items-center justify-center text-sm text-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading editor…
                </div>
              )}
            </div>

            {notice && (
              <p role="status" className="rounded-lg border border-gold/25 bg-gold-light/25 px-3 py-2 text-sm text-navy">
                {notice}
              </p>
            )}
          </div>

          <SettingsPanel
            open={panelOpen}
            userOpen={panelPref}
            onClose={() => setPanelPref(false)}
            stats={stats}
            published={Boolean(initial?.published)}
            featuredUrl={featuredUrl}
            autoCover={autoCover}
            autoCoverUrl={stats.firstImage}
            featuredUploading={featuredUploading}
            onFeaturedFile={handleFeaturedFile}
            onFeaturedRemove={handleFeaturedRemove}
            onAutoCoverChange={setAutoCover}
            slug={slugField.slug}
            slugState={slugField.state}
            slugSuggestion={slugField.suggestion}
            onSlugChange={slugField.setSlug}
            onSlugBlur={slugField.finalize}
            onSlugRegenerate={slugField.regenerate}
            publishDate={publishDate}
            onPublishDateChange={setPublishDate}
            excerptInitial={initial?.excerpt ?? null}
            onExcerptChange={(doc) => {
              excerptRef.current = doc;
            }}
          />
        </div>

        <input
          ref={imageInput}
          type="file"
          accept={CONTENT_ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(e) => handleImageFile(e.target.files)}
        />
        <input
          ref={galleryInput}
          type="file"
          accept={CONTENT_ACCEPT_ATTRIBUTE}
          multiple
          className="hidden"
          onChange={(e) => handleGalleryFiles(e.target.files)}
        />
      </main>

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </>
  );
}
