"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import DashboardHeader from "@/app/dashboard/components/DashboardHeader";
import SectionCard from "@/app/dashboard/components/form/SectionCard";
import FormSectionNav, {
  useActiveSection,
  type FormSection,
} from "@/app/dashboard/components/form/FormSectionNav";
import FormProgressPanel from "@/app/dashboard/components/form/FormProgressPanel";
import {
  FieldLabel,
  FieldError,
  TextInput,
  TextArea,
  RepeatableRows,
} from "@/app/dashboard/components/form/FormFields";
import {
  INITIAL_LOCALITY_FORM_STATE,
  slugify,
  type LocalityFormState,
} from "./form-types";
import { validateForm, hasErrors, type FormErrors } from "./validation";
import { buildLocalityPayload, insertLocality, isSlugTaken } from "./create-locality";

const LOCALITY_FORM_SECTIONS: FormSection[] = [
  { id: "section-basic", label: "Basic Information" },
  { id: "section-overview", label: "Overview" },
  { id: "section-connectivity", label: "Connectivity" },
  { id: "section-price-trends", label: "Price Trends" },
  { id: "section-images", label: "Images" },
  { id: "section-publishing", label: "Publishing" },
];

const LOCALITY_TIPS = [
  "Fill all required fields marked with *",
  "Keep descriptions clear and concise",
  "Image URLs will show a preview once entered",
];

type SubmitMode = "draft" | "publish" | null;

export default function AddLocalityForm() {
  const router = useRouter();
  const activeSectionId = useActiveSection(LOCALITY_FORM_SECTIONS);

  const [form, setForm] = useState<LocalityFormState>(INITIAL_LOCALITY_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState<SubmitMode>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof LocalityFormState>(key: K, value: LocalityFormState[K]) {
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
    if (submitting) return; // prevent duplicate submission

    setServerError(null);

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setSubmitting(mode);

    const supabase = createClient();

    const slugTaken = await isSlugTaken(supabase, form.slug.trim());
    if (slugTaken) {
      setErrors((prev) => ({ ...prev, slug: "This slug is already in use." }));
      setSubmitting(null);
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const payload = buildLocalityPayload(form, mode === "publish");
    const result = await insertLocality(supabase, payload);

    setSubmitting(null);

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong while saving the locality.");
      return;
    }

    router.push("/dashboard/localities");
  }

  const isBusy = submitting !== null;

  return (
    <>
      <DashboardHeader
        title="Add Locality"
        subtitle="Create a new locality for the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
        backHref="/dashboard/localities"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/localities")}
              disabled={isBusy}
              className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              disabled={isBusy}
              className="flex items-center justify-center gap-2 rounded-lg border border-gold px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold-light/20 disabled:opacity-50"
            >
              {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("publish")}
              disabled={isBusy}
              className="flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50"
            >
              {submitting === "publish" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Publish Locality
            </button>
          </div>
        }
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr_260px]">
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <FormSectionNav sections={LOCALITY_FORM_SECTIONS} activeId={activeSectionId} />
            </div>
          </div>

          <div className="space-y-5">
            {serverError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{serverError}</p>
              </div>
            )}

            {/* 1. Basic Information */}
            <SectionCard
              id="section-basic"
              number={1}
              title="Basic Information"
              description="Add the core details about the locality."
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Locality Name</FieldLabel>
                  <TextInput
                    value={form.name}
                    onChange={handleNameChange}
                    placeholder="Enter locality name"
                    error={errors.name}
                  />
                  <FieldError message={errors.name} />
                </div>
                <div>
                  <FieldLabel>Slug</FieldLabel>
                  <TextInput
                    value={form.slug}
                    onChange={handleSlugChange}
                    placeholder="e.g. whitefield"
                    error={errors.slug}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Auto-generated from locality name (you can edit)
                  </p>
                  <FieldError message={errors.slug} />
                </div>

                <div>
                  <FieldLabel required>City</FieldLabel>
                  <TextInput
                    value={form.city}
                    onChange={(v) => set("city", v)}
                    placeholder="e.g. Bangalore"
                    error={errors.city}
                  />
                  <FieldError message={errors.city} />
                </div>
              </div>
            </SectionCard>

            {/* 2. Overview */}
            <SectionCard
              id="section-overview"
              number={2}
              title="Overview"
              description="Describe this locality for the website."
            >
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
                <FieldLabel optional>Full Description</FieldLabel>
                <TextArea
                  value={form.fullDescription}
                  onChange={(v) => set("fullDescription", v)}
                  placeholder="Enter a detailed locality description…"
                  rows={6}
                />
              </div>
            </SectionCard>

            {/* 3. Connectivity */}
            <SectionCard
              id="section-connectivity"
              number={3}
              title="Connectivity"
              description="List notable connectivity options for this locality."
            >
              <div>
                <FieldLabel optional>Connectivity</FieldLabel>
                <RepeatableRows
                  rows={form.connectivity}
                  onChange={(v) => set("connectivity", v)}
                  fields={[
                    { key: "label", placeholder: "e.g. Whitefield Metro Station" },
                    { key: "info", placeholder: "e.g. 10 mins drive" },
                  ]}
                  emptyRow={{ label: "", info: "" }}
                  addLabel="Add Connectivity"
                />
              </div>
            </SectionCard>

            {/* 4. Price Trends */}
            <SectionCard
              id="section-price-trends"
              number={4}
              title="Price Trends"
              description="Track how average pricing has moved over time for this locality."
            >
              <div>
                <FieldLabel optional>Price Trends</FieldLabel>
                <RepeatableRows
                  rows={form.priceTrends}
                  onChange={(v) => set("priceTrends", v)}
                  fields={[
                    { key: "period", placeholder: "e.g. 2023" },
                    { key: "price", placeholder: "e.g. ₹5,200/sq.ft" },
                  ]}
                  emptyRow={{ period: "", price: "" }}
                  addLabel="Add Price Trend"
                />
              </div>
            </SectionCard>

            {/* 5. Images */}
            <SectionCard
              id="section-images"
              number={5}
              title="Images"
              description="Add image URLs for this locality. Direct file upload will be available once Supabase Storage is connected."
            >
              <div>
                <FieldLabel optional>Hero Image URL</FieldLabel>
                <TextInput
                  value={form.heroImageUrl}
                  onChange={(v) => set("heroImageUrl", v)}
                  placeholder="https://…"
                />
                <ImagePreview url={form.heroImageUrl} />
              </div>
              <div>
                <FieldLabel optional>Gallery / Main Image URL</FieldLabel>
                <TextInput
                  value={form.mainImageUrl}
                  onChange={(v) => set("mainImageUrl", v)}
                  placeholder="https://…"
                />
                <ImagePreview url={form.mainImageUrl} />
              </div>
            </SectionCard>

            {/* 6. Publishing */}
            <SectionCard
              id="section-publishing"
              number={6}
              title="Publishing"
              description="Control visibility on the website."
            >
              <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
                This locality will be saved as a <span className="font-semibold text-ink">Draft</span> or{" "}
                <span className="font-semibold text-ink">Published</span> depending on whether you
                choose <span className="font-semibold text-ink">Save Draft</span> or{" "}
                <span className="font-semibold text-ink">Publish Locality</span> above.
              </p>
            </SectionCard>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-6">
              <FormProgressPanel
                sections={LOCALITY_FORM_SECTIONS}
                activeId={activeSectionId}
                tips={LOCALITY_TIPS}
              />
            </div>
          </div>
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
      <div className="mt-2 flex h-24 w-36 items-center justify-center rounded-lg border border-dashed border-line bg-surface">
        <ImagePlus className="h-5 w-5 text-gray-300" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={trimmed}
      alt="Preview"
      className="mt-2 h-24 w-36 rounded-lg border border-line object-cover"
      onError={() => setFailed(true)}
    />
  );
}
