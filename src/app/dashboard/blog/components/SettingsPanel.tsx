"use client";

import { useRef, type ReactNode } from "react";
import { AlertTriangle, Check, ImagePlus, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import { CONTENT_ACCEPT_ATTRIBUTE } from "@/lib/content-images";
import GoldDatePicker from "@/app/dashboard/components/form/GoldDatePicker";
import ExcerptEditor from "./ExcerptEditor";
import type { SlugState } from "./use-slug-field";

interface SettingsPanelProps {
  open: boolean;
  /** null = never toggled (open on desktop, closed on mobile) — keeps server HTML free of a flashing drawer. */
  userOpen: boolean | null;
  onClose: () => void;
  stats: { words: number; minutes: number };
  published: boolean;

  featuredUrl: string | null;
  autoCover: boolean;
  autoCoverUrl: string | null;
  featuredUploading: boolean;
  onFeaturedFile: (file: File) => void;
  onFeaturedRemove: () => void;
  onAutoCoverChange: (value: boolean) => void;

  slug: string;
  slugState: SlugState;
  slugSuggestion: string;
  onSlugChange: (value: string) => void;
  onSlugBlur: () => void;
  onSlugRegenerate: () => void;

  publishDate: string;
  onPublishDateChange: (value: string) => void;

  excerptInitial: JSONContent | null;
  onExcerptChange: (doc: JSONContent | null) => void;
}

const SLUG_MESSAGES: Record<SlugState, { text: string; tone: "muted" | "ok" | "bad" }> = {
  empty: { text: "Add a title to generate the URL.", tone: "muted" },
  invalid: { text: "Use lowercase letters, numbers and single hyphens only.", tone: "bad" },
  checking: { text: "Checking availability…", tone: "muted" },
  available: { text: "This URL is available.", tone: "ok" },
  taken: { text: "Another post already uses this URL.", tone: "bad" },
  error: { text: "Couldn't check availability. It will be checked again when you save.", tone: "muted" },
};

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold">{title}</h3>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </section>
  );
}

export default function SettingsPanel(props: SettingsPanelProps) {
  const {
    open, userOpen, onClose, stats, published,
    featuredUrl, autoCover, autoCoverUrl, featuredUploading, onFeaturedFile, onFeaturedRemove, onAutoCoverChange,
    slug, slugState, slugSuggestion, onSlugChange, onSlugBlur, onSlugRegenerate,
    publishDate, onPublishDateChange, excerptInitial, onExcerptChange,
  } = props;
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = featuredUrl ?? (autoCover ? autoCoverUrl : null);
  const slugMessage = SLUG_MESSAGES[slugState];

  return (
    <>
      {/* Mobile/tablet backdrop */}
      {userOpen === true && <div className="fixed inset-0 z-40 bg-navy/40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        id="blog-settings-panel"
        aria-label="Post settings"
        className={`${
          userOpen === null ? "hidden lg:block" : userOpen ? "block" : "hidden"
        } fixed inset-y-0 right-0 z-[45] w-[min(92vw,380px)] overflow-y-auto border-l border-line bg-white shadow-2xl lg:sticky lg:top-24 lg:z-auto lg:max-h-[calc(100vh-7.5rem)] lg:w-auto lg:self-start lg:rounded-2xl lg:border lg:shadow-sm`}
      >
        <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold lg:rounded-t-2xl" />
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-navy">Settings</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              {published ? "Published" : "Draft"} · {stats.words} words · {stats.minutes} min read
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings panel"
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {/* Featured image */}
          <Section
            title="Featured image"
            hint="Shown as the cover on the Blog list. JPG, PNG or WebP, up to 5 MB."
          >
            {preview ? (
              <div className="overflow-hidden rounded-xl border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Featured image preview" className="aspect-[16/9] w-full object-cover" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={featuredUploading}
                className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold/50 bg-gold-light/10 text-sm font-semibold text-gold transition hover:bg-gold-light/25 disabled:opacity-60"
              >
                {featuredUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                {featuredUploading ? "Uploading…" : "Add featured image"}
              </button>
            )}
            {featuredUrl ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={featuredUploading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-gold/50 disabled:opacity-50"
                >
                  {featuredUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Replace
                </button>
                <button
                  type="button"
                  onClick={onFeaturedRemove}
                  disabled={featuredUploading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            ) : (
              autoCover &&
              autoCoverUrl && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={featuredUploading}
                  className="w-full rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-gold/50 disabled:opacity-50"
                >
                  Upload a different image
                </button>
              )
            )}
            <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs text-muted">
              <input
                type="checkbox"
                checked={autoCover}
                onChange={(e) => onAutoCoverChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line accent-[var(--color-gold)]"
              />
              Use the first image in the article when no featured image is set
            </label>
            <input
              ref={fileInput}
              type="file"
              accept={CONTENT_ACCEPT_ATTRIBUTE}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onFeaturedFile(file);
              }}
            />
          </Section>

          {/* Slug */}
          <Section title="Post slug">
            <input
              type="text"
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              onBlur={onSlugBlur}
              placeholder="post-url"
              aria-label="Post slug"
              aria-invalid={slugState === "invalid" || slugState === "taken"}
              spellCheck={false}
              className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-300 ${
                slugState === "invalid" || slugState === "taken" ? "border-red-400" : "border-line"
              }`}
            />
            <p
              role="status"
              className={`flex items-center gap-1.5 text-xs ${
                slugMessage.tone === "ok" ? "text-emerald-700" : slugMessage.tone === "bad" ? "text-red-600" : "text-muted"
              }`}
            >
              {slugState === "checking" && <Loader2 className="h-3 w-3 animate-spin" />}
              {slugState === "available" && <Check className="h-3 w-3" />}
              {(slugState === "taken" || slugState === "invalid") && <AlertTriangle className="h-3 w-3" />}
              {slugMessage.text}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSlugRegenerate}
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-gold/50"
              >
                <RefreshCw className="h-3 w-3" /> Generate from title
              </button>
              {slugState === "taken" && slugSuggestion && (
                <button
                  type="button"
                  onClick={() => onSlugChange(slugSuggestion)}
                  className="rounded-lg border border-gold/50 bg-gold-light/20 px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-gold-light/40"
                >
                  Use “{slugSuggestion}”
                </button>
              )}
            </div>
          </Section>

          {/* Publish date */}
          <Section title="Publish date">
            <GoldDatePicker
              value={publishDate}
              onChange={onPublishDateChange}
              ariaLabel="Publish date"
              clearable={false}
            />
          </Section>

          {/* Excerpt */}
          <Section title="Excerpt" hint="A short summary shown on the Blog list and in search results.">
            <ExcerptEditor initial={excerptInitial} onChange={onExcerptChange} />
          </Section>
        </div>
      </aside>
    </>
  );
}
