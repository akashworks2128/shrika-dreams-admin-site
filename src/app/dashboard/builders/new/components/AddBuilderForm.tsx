"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import { CONTENT_ACCEPT_ATTRIBUTE, uploadContentImage, removeContentImageByUrl } from "@/lib/content-images";
import DashboardHeader from "@/app/dashboard/components/DashboardHeader";
import SectionCard from "@/app/dashboard/components/form/SectionCard";
import ErrorToast from "@/app/dashboard/components/ErrorToast";
import {
  FieldLabel,
  FieldError,
  TextInput,
  TextArea,
} from "@/app/dashboard/components/form/FormFields";
import { INITIAL_BUILDER_FORM_STATE, slugify, type BuilderFormState } from "./form-types";
import { validateForm, hasErrors, type FormErrors } from "./validation";
import { buildBuilderPayload, insertBuilder, updateBuilder, isSlugTaken } from "./create-builder";

interface AddBuilderFormProps {
  initialForm?: BuilderFormState;
  builderId?: string;
}

export default function AddBuilderForm({ initialForm, builderId }: AddBuilderFormProps = {}) {
  const router = useRouter();

  const [form, setForm] = useState<BuilderFormState>(
    initialForm ?? INITIAL_BUILDER_FORM_STATE,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<"logo" | "image", File | null>>({ logo: null, image: null });

  function set<K extends keyof BuilderFormState>(key: K, value: BuilderFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: prev.slugTouched ? prev.slug : slugify(value),
    }));
  }

  function handleSlugChange(value: string) {
    setForm((prev) => ({ ...prev, slug: value, slugTouched: true }));
  }

  async function handleSubmit(mode: "draft" | "publish") {
    if (submitting || success) return; // prevent duplicate submission

    setServerError(null);

    const validationErrors = validateForm(form, mode === "publish", { logo: Boolean(imageFiles.logo), image: Boolean(imageFiles.image) });
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setSubmitting(mode);

    const supabase = createClient();

    const slugTaken = await isSlugTaken(supabase, form.slug.trim(), builderId);
    if (slugTaken) {
      setErrors((prev) => ({ ...prev, slug: "This slug is already in use." }));
      setSubmitting(null);
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const payload = buildBuilderPayload(form, mode === "publish");
    const previousUrls = { logo: form.logoUrl, image: form.imageUrl };
    const result = builderId
      ? await updateBuilder(supabase, builderId, payload)
      : await insertBuilder(supabase, payload);

    if (!result.success || !result.builderId) {
      setSubmitting(null);
      const message = result.error ?? "Something went wrong while saving the builder.";
      setServerError(message);
      setImageError(message);
      return;
    }

    const uploaded: Partial<Record<"logo" | "image", string>> = {};
    for (const [field, file] of Object.entries(imageFiles) as ["logo" | "image", File | null][]) {
      if (!file) continue;
      const upload = await uploadContentImage(supabase, "builders", result.builderId, field, file);
      if (upload.error || !upload.url) {
        setSubmitting(null);
        setServerError(upload.error ?? "Could not upload builder image.");
        setImageError(upload.error ?? "Could not upload builder image.");
        return;
      }
      uploaded[field] = upload.url;
    }

    if (Object.keys(uploaded).length > 0) {
      const imagePayload: Record<string, unknown> = {};
      if (uploaded.logo) imagePayload.logo_url = uploaded.logo;
      if (uploaded.image) imagePayload.image_url = uploaded.image;
      const { error: imageUpdateError } = await supabase
        .from("builders")
        .update(imagePayload)
        .eq("id", result.builderId);
      if (imageUpdateError) {
        setSubmitting(null);
        setServerError(`The builder was saved, but its images could not be saved: ${imageUpdateError.message}`);
        setImageError(`The builder was saved, but its images could not be saved: ${imageUpdateError.message}`);
        return;
      }
      for (const field of ["logo", "image"] as const) {
        if (uploaded[field] && previousUrls[field] && previousUrls[field] !== uploaded[field]) {
          await removeContentImageByUrl(supabase, previousUrls[field]);
        }
      }
    }

    setSubmitting(null);

    // Show a brief success state, then hand off to Builders Management —
    // where the new row will already be there since it's fetched fresh
    // on that page's next render.
    setSuccess(true);
    setTimeout(() => router.push("/dashboard/builders"), 900);
  }

  const isBusy = submitting !== null || success;

  return (
    <>
      <ErrorToast message={imageError} onDismiss={() => setImageError(null)} />
      <DashboardHeader
        title={builderId ? "Edit Builder" : "Add Builder"}
        subtitle={
          builderId
            ? "Update this builder."
            : "Create a new builder to appear on the Shrika Dreams website."
        }
        adminName={ADMIN_DISPLAY_NAME}
        backHref="/dashboard/builders"
        action={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button type="button" onClick={() => router.push("/dashboard/builders")} disabled={isBusy} className="min-w-0 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50 sm:px-4">Cancel</button>
            <button type="button" onClick={() => handleSubmit("draft")} disabled={isBusy} className="flex min-w-0 items-center justify-center gap-2 rounded-lg border border-gold px-3 py-2.5 text-sm font-semibold text-gold hover:bg-gold-light/20 disabled:opacity-50 sm:px-4">
              {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
              Save as Draft
            </button>
            <button type="button" onClick={() => handleSubmit("publish")} disabled={isBusy} className="col-span-2 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 sm:col-span-1 sm:px-4">
              {submitting === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Publish Builder
            </button>
          </div>
        }
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{serverError}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {builderId ? "Builder updated." : "Builder created."} Taking you back to Builders Management…
              </p>
            </div>
          )}

          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">Fields marked <span className="font-bold text-red-500">*</span> are required to publish. You can save a draft any time.</p>

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          {/* 1. Basic Information */}
          <SectionCard
            id="section-basic"
            number={1}
            title="Basic Information"
            description="Add the core details about the builder."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel required>Builder Name</FieldLabel>
                <TextInput
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="Enter builder name"
                  error={errors.name}
                  disabled={isBusy}
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <FieldLabel required>Slug</FieldLabel>
                <TextInput
                  value={form.slug}
                  onChange={handleSlugChange}
                  placeholder="e.g. prestige-group"
                  error={errors.slug}
                  disabled={isBusy}
                />
                <p className="mt-1 text-xs text-muted">
                  Auto-generated from builder name (you can edit)
                </p>
                <FieldError message={errors.slug} />
              </div>


              <div>
                <FieldLabel required>Years of Experience</FieldLabel>
                <TextInput value={form.yearsExperience} onChange={(v) => set("yearsExperience", v)} placeholder="e.g. 38+ Years" error={errors.yearsExperience} disabled={isBusy} />
                <FieldError message={errors.yearsExperience} />
              </div>
              <div>
                <FieldLabel required>Projects Count</FieldLabel>
                <TextInput value={form.projectsCount} onChange={(v) => set("projectsCount", v)} placeholder="e.g. 300+ Projects" error={errors.projectsCount} disabled={isBusy} />
                <FieldError message={errors.projectsCount} />
              </div>

            </div>

            <div>
              <FieldLabel required>Tagline</FieldLabel>
              <TextInput value={form.tagline} onChange={(v) => set("tagline", v)} placeholder="e.g. Building better homes for modern India" error={errors.tagline} disabled={isBusy} />
              <FieldError message={errors.tagline} />
            </div>

            <div>
              <FieldLabel required>Short Description</FieldLabel>
              <TextArea
                value={form.shortDescription}
                onChange={(v) => set("shortDescription", v)}
                placeholder="Enter a short description (max 200 characters)"
                rows={2}
                maxLength={200}
                error={errors.shortDescription}
              />
              <FieldError message={errors.shortDescription} />
            </div>

            <div>
              <FieldLabel required>About</FieldLabel>
              <TextArea
                value={form.about}
                onChange={(v) => set("about", v)}
                placeholder="Enter a detailed description of this builder…"
                rows={5}
                error={errors.about}
              />
              <FieldError message={errors.about} />
            </div>
          </SectionCard>

          {/* 2. Images */}
          <SectionCard
            id="section-images"
            number={2}
            title="Images"
            description="Add the logo and hero image used across the public builder pages."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ImageUploadField
                label="Logo"
                required
                url={form.logoUrl}
                file={imageFiles.logo}
                onUrlChange={(v) => set("logoUrl", v)}
                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, logo: file }))}
                disabled={isBusy}
              />
              {errors.logoUrl && <FieldError message={errors.logoUrl} />}
              <ImageUploadField
                label="Image"
                required
                url={form.imageUrl}
                file={imageFiles.image}
                onUrlChange={(v) => set("imageUrl", v)}
                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, image: file }))}
                disabled={isBusy}
              />
              {errors.imageUrl && <FieldError message={errors.imageUrl} />}
            </div>
            <p className="text-xs text-muted">
              Direct file upload will be available once Supabase Storage is connected — for now,
              paste an image URL.
            </p>

            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Use <span className="font-semibold text-ink">Save as Draft</span> while preparing the builder. Use <span className="font-semibold text-ink">Publish Builder</span> when all required fields are complete.</p>
          </SectionCard>
          </div>
        </div>
      </main>
    </>
  );
}

function ImageUploadField({
  label,
  required = false,
  url,
  file,
  onUrlChange,
  onFileChange,
  disabled,
}: {
  label: string;
  required?: boolean;
  url: string;
  file: File | null;
  onUrlChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState(url.trim());

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing preview with a browser object URL
      setPreviewUrl(url.trim());
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, url]);

  return (
    <div className="min-w-0">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="flex flex-col gap-2">
        <TextInput type="url" value={url} onChange={onUrlChange} placeholder="https://… or upload a file" disabled={disabled} />
        <label className={`flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-surface px-4 text-center transition-colors hover:border-gold hover:bg-gold-light/10 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
          <ImagePlus className="h-6 w-6 text-gold" />
          <span className="text-sm font-semibold text-ink">{file ? "Image selected" : "Upload Image"}</span>
          <span className="text-[11px] leading-snug text-muted">JPG, PNG or WebP · up to 5 MB</span>
          <input type="file" accept={CONTENT_ACCEPT_ATTRIBUTE} className="hidden" disabled={disabled} onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
        </label>
        <div className="h-36 w-full">
          {previewUrl ? (
            <div className="relative h-full w-full overflow-hidden rounded-xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={`${label} preview`} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-line bg-surface">
              <ImagePlus className="h-6 w-6 text-gray-300" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImagePreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url.trim();

  if (!trimmed) return null;

  if (failed) {
    return (
      <div className="mt-2 flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-line bg-surface">
        <ImagePlus className="h-5 w-5 text-gray-300" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt="Preview"
      className="mt-2 h-24 w-24 rounded-lg border border-line object-cover"
      onError={() => setFailed(true)}
    />
  );
}
