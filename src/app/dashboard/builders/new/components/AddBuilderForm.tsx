"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import DashboardHeader from "@/app/dashboard/components/DashboardHeader";
import SectionCard from "@/app/dashboard/components/form/SectionCard";
import {
  FieldLabel,
  FieldError,
  TextInput,
  TextArea,
  SelectInput,
} from "@/app/dashboard/components/form/FormFields";
import { INITIAL_BUILDER_FORM_STATE, slugify, type BuilderFormState } from "./form-types";
import { validateForm, hasErrors, type FormErrors } from "./validation";
import { buildBuilderPayload, insertBuilder, isSlugTaken } from "./create-builder";

const STATUS_OPTIONS = ["Draft", "Published"] as const;

export default function AddBuilderForm() {
  const router = useRouter();

  const [form, setForm] = useState<BuilderFormState>(INITIAL_BUILDER_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  async function handleSubmit() {
    if (submitting || success) return; // prevent duplicate submission

    setServerError(null);

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setSubmitting(true);

    const supabase = createClient();

    const slugTaken = await isSlugTaken(supabase, form.slug.trim());
    if (slugTaken) {
      setErrors((prev) => ({ ...prev, slug: "This slug is already in use." }));
      setSubmitting(false);
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const payload = buildBuilderPayload(form);
    const result = await insertBuilder(supabase, payload);

    setSubmitting(false);

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong while saving the builder.");
      return;
    }

    // Show a brief success state, then hand off to Builders Management —
    // where the new row will already be there since it's fetched fresh
    // on that page's next render.
    setSuccess(true);
    setTimeout(() => router.push("/dashboard/builders"), 900);
  }

  const isBusy = submitting || success;

  return (
    <>
      <DashboardHeader
        title="Add Builder"
        subtitle="Create a new builder to appear on the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
        backHref="/dashboard/builders"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/builders")}
              disabled={isBusy}
              className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isBusy}
              className="flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Add Builder
            </button>
          </div>
        }
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="mx-auto max-w-3xl space-y-5">
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{serverError}</p>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Builder created. Taking you back to Builders Management…</p>
            </div>
          )}

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
                <FieldLabel optional>Headquarters</FieldLabel>
                <TextInput
                  value={form.headquarters}
                  onChange={(v) => set("headquarters", v)}
                  placeholder="e.g. Bangalore, India"
                  disabled={isBusy}
                />
              </div>
              <div>
                <FieldLabel optional>Founded Year</FieldLabel>
                <TextInput
                  type="number"
                  value={form.foundedYear}
                  onChange={(v) => set("foundedYear", v)}
                  placeholder="e.g. 1986"
                  error={errors.foundedYear}
                  disabled={isBusy}
                />
                <FieldError message={errors.foundedYear} />
              </div>

              <div className="sm:col-span-2">
                <FieldLabel optional>Website URL</FieldLabel>
                <TextInput
                  type="url"
                  value={form.websiteUrl}
                  onChange={(v) => set("websiteUrl", v)}
                  placeholder="https://…"
                  disabled={isBusy}
                />
              </div>
            </div>

            <div>
              <FieldLabel optional>Short Description</FieldLabel>
              <TextArea
                value={form.shortDescription}
                onChange={(v) => set("shortDescription", v)}
                placeholder="Enter a short description (max 200 characters)"
                rows={2}
                maxLength={200}
              />
            </div>

            <div>
              <FieldLabel optional>About</FieldLabel>
              <TextArea
                value={form.about}
                onChange={(v) => set("about", v)}
                placeholder="Enter a detailed description of this builder…"
                rows={5}
              />
            </div>
          </SectionCard>

          {/* 2. Images & Status */}
          <SectionCard
            id="section-images-status"
            number={2}
            title="Images & Status"
            description="Add image URLs and control visibility on the website."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel optional>Logo URL</FieldLabel>
                <TextInput
                  type="url"
                  value={form.logoUrl}
                  onChange={(v) => set("logoUrl", v)}
                  placeholder="https://…"
                  disabled={isBusy}
                />
                <ImagePreview url={form.logoUrl} />
              </div>
              <div>
                <FieldLabel optional>Image URL</FieldLabel>
                <TextInput
                  type="url"
                  value={form.imageUrl}
                  onChange={(v) => set("imageUrl", v)}
                  placeholder="https://…"
                  disabled={isBusy}
                />
                <ImagePreview url={form.imageUrl} />
              </div>
            </div>
            <p className="text-xs text-muted">
              Direct file upload will be available once Supabase Storage is connected — for now,
              paste an image URL.
            </p>

            <div className="max-w-xs">
              <FieldLabel required>Status</FieldLabel>
              <SelectInput
                value={form.status}
                onChange={(v) => set("status", v as BuilderFormState["status"])}
                placeholder="Select status"
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
              <p className="mt-1 text-xs text-muted">
                Published builders are visible on the website. Draft builders are hidden until
                published.
              </p>
            </div>
          </SectionCard>
        </div>
      </main>
    </>
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
