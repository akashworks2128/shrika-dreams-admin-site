"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, TrainFront, Plane, Building2, ShoppingBag, Stethoscope, GraduationCap, Sparkles, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import { CONTENT_ACCEPT_ATTRIBUTE, uploadContentImage, removeContentImageByUrl } from "@/lib/content-images";
import DashboardHeader from "@/app/dashboard/components/DashboardHeader";
import SectionCard from "@/app/dashboard/components/form/SectionCard";
import FormSectionNav, {
  useActiveSection,
  type FormSection,
} from "@/app/dashboard/components/form/FormSectionNav";
import FormTipsBanner from "@/app/dashboard/components/form/FormTipsBanner";
import ErrorToast from "@/app/dashboard/components/ErrorToast";
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
import { buildLocalityPayload, insertLocality, updateLocality, isSlugTaken } from "./create-locality";

const LOCALITY_FORM_SECTIONS: FormSection[] = [
  { id: "section-basic", label: "Basic Information" },
  { id: "section-overview", label: "Overview" },
  { id: "section-about", label: "About This Locality" },
  { id: "section-images", label: "Images" },
  { id: "section-connectivity", label: "Connectivity" },
  { id: "section-price-trends", label: "Price Trends" },
  { id: "section-why-buy", label: "Why Buy Here" },
  { id: "section-publishing", label: "Publishing" },
];


const hasText = (v: string) => v.trim().length > 0;

function getLocalityProgress(form: LocalityFormState) {
  const filledRows = (rows: Record<string, string>[]) =>
    rows.some((r) => Object.values(r).some(hasText));

  const done: Record<string, boolean> = {
    "section-basic": hasText(form.name) && hasText(form.slug) && hasText(form.city),
    "section-overview": hasText(form.shortDescription) && hasText(form.fullDescription) && hasText(form.averagePrice) && hasText(form.popularBhk),
    "section-about": hasText(form.aboutTitle) && hasText(form.aboutDescription) && hasText(form.aboutImageUrl),
    "section-images": hasText(form.heroImageUrl) && hasText(form.mainImageUrl),
    "section-connectivity": form.connectivity.some((row) => hasText(row.label) && hasText(row.info)),
    "section-price-trends": form.priceTrends.some((row) => hasText(row.period) && hasText(row.price)),
    "section-why-buy": form.whyBuy.some((row) => hasText(row.label) && hasText(row.info)),
  };

  return {
    completedSectionIds: Object.keys(done).filter((id) => done[id]),
  };
}

type SubmitMode = "draft" | "publish" | null;

const CONNECTIVITY_OPTIONS = [
  { label: "Metro", icon: "metro", Icon: TrainFront },
  { label: "Airport", icon: "airport", Icon: Plane },
  { label: "IT Parks", icon: "itParks", Icon: Building2 },
  { label: "Schools", icon: "schools", Icon: GraduationCap },
  { label: "Hospitals", icon: "hospitals", Icon: Stethoscope },
  { label: "Shopping", icon: "shopping", Icon: ShoppingBag },
] as const;

const WHY_BUY_PRESETS = [
  { label: "Affordable Entry Point", info: "Accessible pricing for buyers looking for strong long-term value." },
  { label: "Major IT Campuses", info: "Close to major employment hubs and established business campuses." },
  { label: "Mature Infrastructure", info: "Established roads, civic infrastructure and everyday social amenities." },
  { label: "Strong Rental Demand", info: "Healthy rental demand supported by nearby employment and education hubs." },
  { label: "Excellent Connectivity", info: "Well connected to key roads, public transport and surrounding corridors." },
  { label: "Future Growth Potential", info: "Ongoing infrastructure and development support long-term appreciation potential." },
] as const;

interface AddLocalityFormProps {
  initialForm?: LocalityFormState;
  localityId?: string;
}

export default function AddLocalityForm({ initialForm, localityId }: AddLocalityFormProps = {}) {
  const router = useRouter();
  const { activeId: activeSectionId, selectSection } = useActiveSection(LOCALITY_FORM_SECTIONS);

  const [form, setForm] = useState<LocalityFormState>(
    initialForm ?? INITIAL_LOCALITY_FORM_STATE,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const { completedSectionIds } = getLocalityProgress(form);
  const [submitting, setSubmitting] = useState<SubmitMode>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<Record<"hero" | "main" | "about", File | null>>({ hero: null, main: null, about: null });

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

    const validationErrors = validateForm(form, mode === "publish", { hero: Boolean(imageFiles.hero), main: Boolean(imageFiles.main), about: Boolean(imageFiles.about) });
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setSubmitting(mode);

    const supabase = createClient();

    const slugTaken = await isSlugTaken(supabase, form.slug.trim(), localityId);
    if (slugTaken) {
      setErrors((prev) => ({ ...prev, slug: "This slug is already in use." }));
      setSubmitting(null);
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const payload = buildLocalityPayload(form, mode === "publish");
    const previousUrls = {
      hero: form.heroImageUrl,
      main: form.mainImageUrl,
      about: form.aboutImageUrl,
    };

    const result = localityId
      ? await updateLocality(supabase, localityId, payload)
      : await insertLocality(supabase, payload);

    if (!result.success || !result.localityId) {
      setSubmitting(null);
      const message = result.error ?? "Something went wrong while saving the locality.";
      setServerError(message);
      setImageError(message);
      return;
    }

    const uploaded: Partial<Record<"hero" | "main" | "about", string>> = {};
    for (const [field, file] of Object.entries(imageFiles) as ["hero" | "main" | "about", File | null][]) {
      if (!file) continue;
      const upload = await uploadContentImage(supabase, "localities", result.localityId, field, file);
      if (upload.error || !upload.url) {
        setSubmitting(null);
        setServerError(upload.error ?? "Could not upload locality image.");
        setImageError(upload.error ?? "Could not upload locality image.");
        return;
      }
      uploaded[field] = upload.url;
    }

    if (Object.keys(uploaded).length > 0) {
      const imagePayload: Record<string, unknown> = {};
      if (uploaded.hero) imagePayload.hero_image_url = uploaded.hero;
      if (uploaded.main) imagePayload.main_image_url = uploaded.main;
      if (uploaded.about) imagePayload.about_image_url = uploaded.about;
      const { error: imageUpdateError } = await supabase
        .from("localities")
        .update(imagePayload)
        .eq("id", result.localityId);
      if (imageUpdateError) {
        setSubmitting(null);
        setServerError(`The locality was saved, but its images could not be saved: ${imageUpdateError.message}`);
        setImageError(`The locality was saved, but its images could not be saved: ${imageUpdateError.message}`);
        return;
      }
      for (const field of ["hero", "main", "about"] as const) {
        if (uploaded[field] && previousUrls[field] && previousUrls[field] !== uploaded[field]) {
          await removeContentImageByUrl(supabase, previousUrls[field]);
        }
      }
    }

    setSubmitting(null);
    router.push("/dashboard/localities");
  }

  const isBusy = submitting !== null;

  return (
    <>
      <ErrorToast message={imageError} onDismiss={() => setImageError(null)} />
      <DashboardHeader
        title={localityId ? "Edit Locality" : "Add Locality"}
        subtitle={
          localityId
            ? "Update this locality."
            : "Create a new locality for the Shrika Dreams website."
        }
        adminName={ADMIN_DISPLAY_NAME}
        backHref="/dashboard/localities"
        action={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={() => router.push("/dashboard/localities")}
              disabled={isBusy}
              className="min-w-0 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50 sm:px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              disabled={isBusy}
              className="flex min-w-0 items-center justify-center gap-2 rounded-lg border border-gold px-3 py-2.5 text-sm font-semibold text-gold hover:bg-gold-light/20 disabled:opacity-50 sm:px-4"
            >
              {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("publish")}
              disabled={isBusy}
              className="col-span-2 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 sm:col-span-1 sm:px-4"
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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <div className="sticky top-36">
              <FormSectionNav
                sections={LOCALITY_FORM_SECTIONS}
                activeId={activeSectionId}
                onSelect={selectSection}
                completedIds={completedSectionIds}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <FormTipsBanner>Fields marked * are required to publish. You can save a draft any time.</FormTipsBanner>
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
                  <FieldLabel required>Slug</FieldLabel>
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
                <FieldLabel required>Tagline</FieldLabel>
                <TextArea
                  value={form.shortDescription}
                  onChange={(v) => set("shortDescription", v)}
                  placeholder="e.g. Established IT corridor with strong residential demand"
                  rows={2}
                  maxLength={200}
                  error={errors.shortDescription}
                />
                <FieldError message={errors.shortDescription} />
              </div>
              <div>
                <FieldLabel required>Full Description</FieldLabel>
                <TextArea
                  value={form.fullDescription}
                  onChange={(v) => set("fullDescription", v)}
                  placeholder="Enter a detailed locality description…"
                  rows={6}
                  error={errors.fullDescription}
                />
                <FieldError message={errors.fullDescription} />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div><FieldLabel required>Average Price</FieldLabel><TextInput value={form.averagePrice} onChange={(v) => set("averagePrice", v)} placeholder="e.g. ₹6,500/sq.ft" error={errors.averagePrice} /><FieldError message={errors.averagePrice} /></div>
                <div><FieldLabel required>Popular BHK / Plot Type</FieldLabel><TextInput value={form.popularBhk} onChange={(v) => set("popularBhk", v)} placeholder="e.g. 2 & 3 BHK" error={errors.popularBhk} /><FieldError message={errors.popularBhk} /></div>
                <div><FieldLabel optional>Active Projects</FieldLabel><TextInput type="number" value={form.activeProjects} onChange={(v) => set("activeProjects", v)} placeholder="e.g. 25" /></div>
              </div>
            </SectionCard>

            {/* 3. About This Locality */}
            <SectionCard id="section-about" number={3} title="About This Locality" description="Manage the title, description and image used in the locality About section.">
              <div><FieldLabel required>About Title</FieldLabel><TextInput value={form.aboutTitle} onChange={(v) => set("aboutTitle", v)} placeholder="e.g. About Electronic City" error={errors.aboutTitle} /><FieldError message={errors.aboutTitle} /></div>
              <div><FieldLabel required>About Description</FieldLabel><TextArea value={form.aboutDescription} onChange={(v) => set("aboutDescription", v)} placeholder="Write the detailed locality overview shown in the About section." rows={6} error={errors.aboutDescription} /><FieldError message={errors.aboutDescription} /></div>
              <ImageUploadField
                label="About Image" required
                url={form.aboutImageUrl}
                file={imageFiles.about}
                onUrlChange={(v) => set("aboutImageUrl", v)}
                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, about: file }))}
              />
              <FieldError message={errors.aboutImageUrl} />
            </SectionCard>

            {/* 4. Images */}
            <SectionCard
              id="section-images"
              number={4}
              title="Images"
              description="Upload locality photos. The hero image is shown first on the listing and locality page."
            >
              <ImageUploadField
                label="Hero Image" required
                url={form.heroImageUrl}
                file={imageFiles.hero}
                onUrlChange={(v) => set("heroImageUrl", v)}
                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, hero: file }))}
              />
              <FieldError message={errors.heroImageUrl} />
              <ImageUploadField
                label="Gallery / Main Image" required
                url={form.mainImageUrl}
                file={imageFiles.main}
                onUrlChange={(v) => set("mainImageUrl", v)}
                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, main: file }))}
              />
              <FieldError message={errors.mainImageUrl} />
            </SectionCard>

            {/* 5. Connectivity */}
            <SectionCard
              id="section-connectivity"
              number={5}
              title="Connectivity"
              description="Select the six locality connectivity categories and add the public-facing detail for each selected item."
            >
              <FieldLabel required>Connectivity Options</FieldLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CONNECTIVITY_OPTIONS.map(({ label, icon, Icon }) => {
                  const selected = form.connectivity.some((row) => row.icon === icon);
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          set("connectivity", form.connectivity.filter((row) => row.icon !== icon));
                        } else {
                          set("connectivity", [...form.connectivity, { label, info: "", icon }]);
                        }
                      }}
                      className={`flex min-h-20 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${selected ? "border-gold bg-gold-light/45 text-ink shadow-sm" : "border-line bg-white text-muted hover:border-gold/50 hover:bg-surface"}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-gold/15 text-gold" : "bg-surface text-muted"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className={`mt-0.5 block text-[11px] ${selected ? "text-gold" : ""}`}>{selected ? "Selected" : "Select"}</span>
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => set("connectivity", [...form.connectivity, { label: "", info: "", icon: `custom-${Date.now()}` }])}
                  className="flex min-h-20 items-center gap-3 rounded-xl border border-dashed border-gold/60 bg-gold-light/10 px-3 py-3 text-left text-navy transition-colors hover:bg-gold-light/20"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold"><Plus className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-sm font-semibold">Custom</span>
                    <span className="mt-0.5 block text-[11px] text-muted">Add your own</span>
                  </span>
                </button>
              </div>

              {form.connectivity.length > 0 && (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Selected details</p>
                  {form.connectivity.map((row, index) => (
                    <div key={`${row.icon}-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-gold/40 bg-gold-light/20 p-3 shadow-sm sm:grid-cols-[180px_minmax(0,1fr)_36px] sm:items-center">
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                        {CONNECTIVITY_OPTIONS.find((option) => option.icon === row.icon)?.Icon ? (() => { const Icon = CONNECTIVITY_OPTIONS.find((option) => option.icon === row.icon)!.Icon; return <Icon className="h-4 w-4 text-gold" />; })() : <Sparkles className="h-4 w-4 text-gold" />}
                        {row.icon.startsWith("custom-") ? (
                          <TextInput value={row.label} onChange={(value) => set("connectivity", form.connectivity.map((item, i) => i === index ? { ...item, label: value } : item))} placeholder="Custom title" />
                        ) : row.label}
                      </div>
                      <TextInput
                        value={row.info}
                        onChange={(value) => set("connectivity", form.connectivity.map((item, i) => i === index ? { ...item, info: value } : item))}
                        placeholder={`e.g. ${row.label === "Airport" ? "KIA — 75 min via NICE Road" : row.label === "Metro" ? "Yellow Line — station nearby" : row.label ? `Major ${row.label.toLowerCase()} nearby` : "Enter the public-facing detail"}`}
                      />
                      <button
                        type="button"
                        onClick={() => set("connectivity", form.connectivity.filter((_, i) => i !== index))}
                        aria-label={`Remove ${row.label}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-white hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <FieldError message={errors.connectivity} />
            </SectionCard>

            {/* 6. Price Trends */}
            <SectionCard
              id="section-price-trends"
              number={6}
              title="Price Trends"
              description="Track how average pricing has moved over time for this locality."
            >
              <div>
                <FieldLabel required>Price Trends</FieldLabel>
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
                <FieldError message={errors.priceTrends} />
              </div>
            </SectionCard>

            {/* 7. Why Buy Here */}
            <SectionCard id="section-why-buy" number={7} title="Why Buy Here" description="Select the reasons buyers should consider this locality, then customize the descriptions." >
              <FieldLabel required>Why Buy Options</FieldLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {WHY_BUY_PRESETS.map((preset) => {
                  const selected = form.whyBuy.some((row) => row.label === preset.label);
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          set("whyBuy", form.whyBuy.filter((row) => row.label !== preset.label));
                        } else {
                          set("whyBuy", [...form.whyBuy, { label: preset.label, info: preset.info }]);
                        }
                      }}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${selected ? "border-gold bg-gold-light/45 text-ink shadow-sm" : "border-line bg-white hover:border-gold/50 hover:bg-surface"}`}
                    >
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-gold/15 text-gold" : "bg-surface text-muted"}`}>
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{preset.label}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted">{preset.info}</span>
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => set("whyBuy", [...form.whyBuy, { label: "", info: "" }])}
                  className="flex items-start gap-3 rounded-xl border border-dashed border-gold/60 bg-gold-light/10 p-4 text-left text-navy transition-colors hover:bg-gold-light/20"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold"><Plus className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block text-sm font-semibold">Custom</span><span className="mt-1 block text-xs text-muted">Add your own reason</span></span>
                </button>
              </div>

              {form.whyBuy.length > 0 && (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Selected reasons</p>
                  {form.whyBuy.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-gold/40 bg-gold-light/20 p-3 shadow-sm sm:grid-cols-[220px_minmax(0,1fr)_36px] sm:items-center">
                      {WHY_BUY_PRESETS.some((preset) => preset.label === row.label) ? (
                        <div className="text-sm font-semibold text-ink">{row.label}</div>
                      ) : (
                        <TextInput value={row.label} onChange={(value) => set("whyBuy", form.whyBuy.map((item, i) => i === index ? { ...item, label: value } : item))} placeholder="Custom reason" />
                      )}
                      <TextInput
                        value={row.info}
                        onChange={(value) => set("whyBuy", form.whyBuy.map((item, i) => i === index ? { ...item, info: value } : item))}
                        placeholder="Enter the public-facing reason description"
                      />
                      <button
                        type="button"
                        onClick={() => set("whyBuy", form.whyBuy.filter((_, i) => i !== index))}
                        aria-label={`Remove ${row.label}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-white hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <FieldError message={errors.whyBuy} />
            </SectionCard>
            {/* 8. Publishing */}
            <SectionCard
              id="section-publishing"
              number={8}
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
}: {
  label: string;
  required?: boolean;
  url: string;
  file: File | null;
  onUrlChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
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
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <TextInput value={url} onChange={onUrlChange} placeholder="https://… or upload a file" />
          <label className="mt-2 flex min-h-[8.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line bg-surface px-3 text-center transition-colors hover:border-gold hover:bg-gold-light/10">
            <ImagePlus className="h-6 w-6 text-gold" />
            <span className="text-sm font-semibold text-ink">{file ? "Image selected" : "Upload Image"}</span>
            <span className="text-[11px] text-muted">JPG, PNG or WebP · up to 5 MB</span>
            <input type="file" accept={CONTENT_ACCEPT_ATTRIBUTE} className="hidden" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="min-h-[8.5rem]">
          {previewUrl ? (
            <div className="relative h-full min-h-[8.5rem] overflow-hidden rounded-xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={`${label} preview`} className="h-full min-h-[8.5rem] w-full object-cover" />
            </div>
          ) : (
            <div className="flex min-h-[8.5rem] items-center justify-center rounded-xl border border-dashed border-line bg-surface">
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
