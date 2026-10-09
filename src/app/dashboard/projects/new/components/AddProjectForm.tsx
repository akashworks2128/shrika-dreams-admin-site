"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Dumbbell,
  ArrowUpDown,
  GraduationCap,
  Hospital,
  Hotel,
  Landmark,
  Loader2,
  MapPin,
  Plane,
  Route,
  School,
  ShieldCheck,
  ShoppingBag,
  Star,
  TrainFront,
  Trees,
  Trophy,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import type { FilterOption } from "@/lib/projects-data";
import {
  syncProjectImages,
  type ProjectImageItem,
  type RemovedProjectImage,
} from "@/lib/project-images";
import DashboardHeader from "@/app/dashboard/components/DashboardHeader";
import ErrorToast from "@/app/dashboard/components/ErrorToast";
import ProjectImagesField from "./ProjectImagesField";
import {
  AREA_UNITS,
  INITIAL_FORM_STATE,
  PRICE_TYPES,
  PRICE_UNITS,
  PROPERTY_TYPES,
  STATUS_OPTIONS,
  slugify,
  type ProjectFormState,
  type ProjectConfigurationFormRow,
} from "./form-types";
import { validateForm, hasErrors, type FormErrors } from "./validation";
import {
  buildProjectPayload,
  insertProject,
  updateProject,
  syncProjectConfigurations,
  isSlugTaken,
  isProjectSlugTaken,
} from "./create-project";
import SectionCard from "@/app/dashboard/components/form/SectionCard";
import { formatPriceRange, formatProjectSize, formatConfigurationArea, formatConfigurationPrice } from "./formatters";
import FormSectionNav, {
  useActiveSection,
  type FormSection,
} from "@/app/dashboard/components/form/FormSectionNav";
import FormTipsBanner from "@/app/dashboard/components/form/FormTipsBanner";
import {
  FieldLabel,
  FieldError,
  TextInput,
  TextArea,
  SelectInput,
  RadioPillGroup,
  ToggleSwitch,
  TagListInput,
  RepeatableRows,
} from "@/app/dashboard/components/form/FormFields";

const PROJECT_FORM_SECTIONS: FormSection[] = [
  { id: "section-basic", label: "Basic Information" },
  { id: "section-pricing", label: "Pricing" },
  { id: "section-overview", label: "Project Overview" },
  { id: "section-details", label: "Property Details" },
  { id: "section-highlights", label: "Highlights & Amenities" },
  { id: "section-images", label: "Images & Documents" },
  { id: "section-location", label: "Location" },
  { id: "section-connectivity", label: "Nearby & Connectivity" },
  { id: "section-publishing", label: "Publishing" },
];


const hasText = (v: string) => v.trim().length > 0;

function getProjectProgress(form: ProjectFormState, imageCount: number) {
  const filledRows = (rows: Record<string, string>[]) =>
    rows.some((r) => Object.values(r).some(hasText));

  const done: Record<string, boolean> = {
    "section-basic":
      hasText(form.name) && hasText(form.slug) && Boolean(form.builderId) &&
      Boolean(form.localityId) && Boolean(form.propertyType) && Boolean(form.status),
    "section-pricing":
      hasText(form.priceMin) || hasText(form.priceDisplay) || hasText(form.pricePerSqft) || form.configurations.length > 0,
    "section-overview": [
      form.projectSize, form.totalUnits, form.totalPlots, form.availableUnits,
      form.possessionDate, form.availability, form.reraNumber, form.reraUrl,
      form.launchDate, form.completionDate,
    ].some(hasText),
    "section-details":
      form.bhkOptions.length > 0 || form.plotSizes.length > 0 ||
      [form.configuration, form.areaRange, form.area].some(hasText),
    "section-highlights": form.highlights.length > 0 || form.amenities.length > 0,
    "section-images": imageCount > 0 || hasText(form.brochureUrl),
    "section-location": [
      form.address, form.pincode, form.googleMapsUrl, form.latitude, form.longitude,
    ].some(hasText),
    "section-connectivity":
      filledRows(form.nearbyLandmarks) || filledRows(form.connectivity),
    "section-publishing": form.isFeatured || hasText(form.sortOrder),
  };

  return {
    completedSectionIds: Object.keys(done).filter((id) => done[id]),
  };
}

interface AddProjectFormProps {
  builders: FilterOption[];
  localities: FilterOption[];
  initialForm?: ProjectFormState;
  initialImages?: ProjectImageItem[];
  initialConfigurations?: ProjectConfigurationFormRow[];
  projectId?: string;
  mode?: "create" | "edit";
}
type SubmitMode = "draft" | "publish" | null;


type PresetOption = {
  label: string;
  icon: LucideIcon;
};

const HIGHLIGHT_PRESETS: PresetOption[] = [
  { label: "Prime Location", icon: MapPin },
  { label: "Grand Clubhouse", icon: Hotel },
  { label: "Swimming Pool", icon: Waves },
  { label: "Modern Gym", icon: Dumbbell },
  { label: "Landscaped Gardens", icon: Trees },
  { label: "24x7 Security", icon: ShieldCheck },
];

const AMENITY_PRESETS: PresetOption[] = [
  { label: "Clubhouse", icon: Hotel },
  { label: "Swimming Pool", icon: Waves },
  { label: "Gymnasium", icon: Dumbbell },
  { label: "Landscaped Gardens", icon: Trees },
  { label: "24x7 Security", icon: ShieldCheck },
  { label: "Covered Parking", icon: Landmark },
  { label: "Kids' Play Area", icon: Star },
  { label: "Sports Courts", icon: Trophy },
  { label: "Power Backup", icon: Zap },
  { label: "High-Speed Elevators", icon: ArrowUpDown },
  { label: "Jogging Track", icon: Route },
  { label: "Banquet Hall", icon: Hotel },
];

const LANDMARK_PRESETS: PresetOption[] = [
  { label: "Metro Station", icon: TrainFront },
  { label: "IT Park / ITPL", icon: Landmark },
  { label: "Shopping Mall", icon: ShoppingBag },
  { label: "Hospital", icon: Hospital },
  { label: "Airport", icon: Plane },
  { label: "Railway Station", icon: TrainFront },
  { label: "School", icon: School },
  { label: "College", icon: GraduationCap },
];

const CONNECTIVITY_PRESETS: PresetOption[] = [
  { label: "Metro", icon: TrainFront },
  { label: "Airport", icon: Plane },
  { label: "ORR", icon: Route },
  { label: "IT Corridor", icon: Landmark },
  { label: "Hosur Road", icon: Route },
  { label: "Metro Connectivity", icon: TrainFront },
];

function PresetPicker({
  options,
  values,
  onToggle,
}: {
  options: PresetOption[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map(({ label, icon: Icon }) => {
        const selected = values.includes(label);
        return (
          <button
            key={label}
            type="button"
            onClick={() => onToggle(label)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${
              selected
                ? "border-gold bg-gold-light/30 text-navy"
                : "border-line bg-white text-muted hover:border-gold/60 hover:bg-surface hover:text-navy"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function AddProjectForm({
  builders,
  localities,
  initialForm,
  initialImages,
  initialConfigurations,
  projectId,
  mode = "create",
}: AddProjectFormProps) {
  const router = useRouter();
  const { activeId: activeSectionId, selectSection } = useActiveSection(PROJECT_FORM_SECTIONS);
  const [form, setForm] = useState<ProjectFormState>(
    initialForm ? { ...initialForm, configurations: initialConfigurations ?? initialForm.configurations ?? [] } : INITIAL_FORM_STATE,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState<SubmitMode>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [images, setImages] = useState<ProjectImageItem[]>(initialImages ?? []);
  const [configurations, setConfigurations] = useState<ProjectConfigurationFormRow[]>(initialConfigurations ?? []);
  const { completedSectionIds } = getProjectProgress(form, images.length);
  const [removedImages, setRemovedImages] = useState<RemovedProjectImage[]>([]);
  // When a new project saved but its images failed, retries must update that
  // project instead of inserting a duplicate.
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [publishValidationAttempted, setPublishValidationAttempted] = useState(false);

  function updateConfigurations(next: ProjectConfigurationFormRow[]) {
    setConfigurations(next);
    set("configurations", next);
  }
  const effectiveProjectId = projectId ?? createdProjectId ?? undefined;

  function set<K extends keyof ProjectFormState>(
    key: K,
    value: ProjectFormState[K],
  ) {
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
    if (submitting) return; // prevent accidental double submission

    setServerError(null);
    setDismissedError(null);
    setWarning(null);
    setPublishValidationAttempted(mode === "publish");

    const validationErrors = validateForm(form, mode === "publish", images.length);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      const firstKey = Object.keys(validationErrors)[0];
      document
        .getElementById(sectionIdForField(firstKey))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setSubmitting(mode);

    const supabase = createClient();

    const slugTaken = effectiveProjectId
      ? await isProjectSlugTaken(supabase, form.slug.trim(), effectiveProjectId)
      : await isSlugTaken(supabase, form.slug.trim());

    if (slugTaken) {
      setErrors((prev) => ({
        ...prev,
        slug: "This slug is already in use.",
      }));

      setSubmitting(null);

      document
        .getElementById("section-basic")
        ?.scrollIntoView({ behavior: "smooth" });

      return;
    }

    const payload = buildProjectPayload(form, mode === "publish");

    const result = effectiveProjectId
      ? await updateProject(supabase, effectiveProjectId, payload)
      : await insertProject(supabase, payload);

    if (!result.success) {
      setSubmitting(null);
      setServerError(
        result.error ?? "Something went wrong while saving the project.",
      );
      return;
    }

    // Images: upload new files to Storage and sync `project_images`.
    // Skipped entirely when there is nothing to change, so editing unrelated
    // fields never touches existing images.
    const savedProjectId = result.projectId ?? effectiveProjectId;
    if (savedProjectId && !projectId) setCreatedProjectId(savedProjectId);

    const hasImageWork =
      removedImages.length > 0 || images.some((img) => img.file || img.id);

    if (savedProjectId && hasImageWork) {
      const imageResult = await syncProjectImages(
        supabase,
        savedProjectId,
        images,
        removedImages,
      );

      if (imageResult.removalsDone) setRemovedImages([]);
      if (imageResult.items) {
        images.forEach((img) => {
          if (img.file && !imageResult.items?.some((i) => i.key === img.key)) {
            URL.revokeObjectURL(img.url);
          }
        });
        setImages(imageResult.items);
      }

      if (!imageResult.success) {
        setSubmitting(null);
        setServerError(
          `The project was saved, but its images could not be saved: ${
            imageResult.error ?? "unknown error"
          }. Fix the problem and press save again — nothing will be duplicated.`,
        );
        return;
      }
    }

    if (savedProjectId) {
      const configurationResult = await syncProjectConfigurations(
        supabase,
        savedProjectId,
        configurations.map((row, index) => ({
          id: row.id,
          configuration: row.configuration,
          area: formatConfigurationArea(row.area),
          price: formatConfigurationPrice(row.price, row.priceUnit),
          availability: row.availability,
          sort_order: Number(row.sortOrder) || index,
        })),
      );

      if (!configurationResult.success) {
        setSubmitting(null);
        setServerError(
          `The project was saved, but its pricing configurations could not be saved: ${configurationResult.error ?? "unknown error"}. Fix the problem and press save again — nothing will be duplicated.`,
        );
        return;
      }
    }

    setSubmitting(null);

    if (result.droppedColumns.length > 0) {
      // Still a success — just let the admin know a few fields weren't
      // stored because those columns don't exist in the database yet.
      setWarning(
        `Project saved, but these fields could not be stored (column not found in the database): ${result.droppedColumns.join(", ")}.`,
      );
      setTimeout(() => router.push("/dashboard/projects"), 2000);
      return;
    }

    router.push("/dashboard/projects");
  }

  const isApartment = form.propertyType === "Apartment";
  const isPlot = form.propertyType === "Plot";
  const isBusy = submitting !== null;
  const popupError = serverError && serverError !== dismissedError ? serverError : null;

  return (
    <>
      <ErrorToast message={popupError} onDismiss={() => setDismissedError(serverError)} />
      <DashboardHeader
        title={projectId ? "Edit Project" : "Add Project"}
        subtitle={
          projectId
            ? "Update this property listing."
            : "Create a new property project for the Shrika Dreams website."
        }
        adminName={ADMIN_DISPLAY_NAME}
        backHref="/dashboard/projects"
        action={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={() => router.push("/dashboard/projects")}
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
              {submitting === "draft" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save as Draft
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
              Publish Project
            </button>
          </div>
        }
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <div className="sticky top-36">
              <FormSectionNav
                sections={PROJECT_FORM_SECTIONS}
                activeId={activeSectionId}
                onSelect={selectSection}
                completedIds={completedSectionIds}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <FormTipsBanner>Fields marked * are required to publish. You can save a draft any time.</FormTipsBanner>
            {mode === "edit" && null}
            {publishValidationAttempted && hasErrors(errors) && submitting === null && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <p className="font-semibold">Please complete the following before publishing:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field}>{validationFieldLabel(field)}{message ? ` — ${message}` : ""}</li>
                  ))}
                </ul>
              </div>
            )}
            {serverError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{serverError}</p>
              </div>
            )}
            {warning && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{warning}</p>
              </div>
            )}

            {/* 1. Basic Information */}
            <SectionCard
              id="section-basic"
              number={1}
              title="Basic Information"
              description="Add the core details about the project."
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Project Name</FieldLabel>
                  <TextInput
                    value={form.name}
                    onChange={handleNameChange}
                    placeholder="Enter project name"
                    error={errors.name}
                  />
                  <FieldError message={errors.name} />
                </div>
                <div>
                  <FieldLabel required>Slug</FieldLabel>
                  <TextInput
                    value={form.slug}
                    onChange={handleSlugChange}
                    placeholder="e.g. prestige-lakeside-habitat"
                    error={errors.slug}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Auto-generated from project name (you can edit)
                  </p>
                  <FieldError message={errors.slug} />
                </div>

                <div>
                  <FieldLabel required>Builder</FieldLabel>
                  <SelectInput
                    value={form.builderId}
                    onChange={(v) => set("builderId", v)}
                    placeholder="Select builder"
                    options={builders.map((b) => ({
                      value: b.id,
                      label: b.name,
                    }))}
                    error={errors.builderId}
                  />
                  <FieldError message={errors.builderId} />
                </div>
                <div>
                  <FieldLabel required>Locality</FieldLabel>
                  <SelectInput
                    value={form.localityId}
                    onChange={(v) => set("localityId", v)}
                    placeholder="Select locality"
                    options={localities.map((l) => ({
                      value: l.id,
                      label: l.name,
                    }))}
                    error={errors.localityId}
                  />
                  <FieldError message={errors.localityId} />
                </div>

                <div>
                  <FieldLabel required>Property Type</FieldLabel>
                  <RadioPillGroup
                    value={form.propertyType}
                    onChange={(v) =>
                      set("propertyType", v as ProjectFormState["propertyType"])
                    }
                    options={[...PROPERTY_TYPES]}
                  />
                  <FieldError message={errors.propertyType} />
                </div>
                <div>
                  <FieldLabel required>Project Availability Status</FieldLabel>
                  <SelectInput
                    value={form.status}
                    onChange={(v) => set("status", v)}
                    placeholder="Select status"
                    options={STATUS_OPTIONS.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                    error={errors.status}
                  />
                  <FieldError message={errors.status} />
                </div>
              </div>

              <div>
                <FieldLabel required>Project Description</FieldLabel>
                <TextArea
                  value={form.description}
                  onChange={(v) => set("description", v)}
                  placeholder="Enter detailed project description…"
                  rows={6}
                  error={errors.description}
                />
                <FieldError message={errors.description} />
              </div>
            </SectionCard>

            {/* 2. Pricing */}
            <SectionCard
              id="section-pricing"
              number={2}
              title="Pricing"
              description="Set the pricing details for the project."
            >
              <div>
                <FieldLabel required>Price Type</FieldLabel>
                <RadioPillGroup
                  value={form.priceType}
                  onChange={(v) => set("priceType", v)}
                  options={[...PRICE_TYPES]}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <FieldLabel required>Starting Price</FieldLabel>
                  <TextInput
                    value={form.priceMin}
                    onChange={(v) => set("priceMin", v)}
                    placeholder="e.g. 1.2"
                    error={errors.priceMin}
                  />
                  <FieldError message={errors.priceMin} />
                </div>
                <div>
                  <FieldLabel>Display Unit</FieldLabel>
                  <SelectInput
                    value={form.priceUnit}
                    onChange={(v) => set("priceUnit", v)}
                    placeholder="Unit"
                    options={PRICE_UNITS.map((u) => ({ value: u, label: u }))}
                  />
                </div>

                {form.priceType !== "Fixed Price" && (
                  <>
                    <div>
                      <FieldLabel required>Maximum Price</FieldLabel>
                      <TextInput
                        value={form.priceMax}
                        onChange={(v) => set("priceMax", v)}
                        placeholder="e.g. 2.5"
                        error={errors.priceMax}
                      />
                      <FieldError message={errors.priceMax} />
                    </div>

                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel optional>Price per Sq.Ft</FieldLabel>
                  <div className="relative">
                    <TextInput
                      value={form.pricePerSqft}
                      onChange={(v) => set("pricePerSqft", v.replace(/[^0-9.]/g, ""))}
                      placeholder="e.g. 4500"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">₹ / sq.ft.</span>
                  </div>
                </div>
                <div>
                  <FieldLabel required>Price Preview</FieldLabel>
                  <div className="flex min-h-[42px] items-center rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink">
                    {formatPriceRange(form.priceMin, form.priceMax, form.priceUnit, form.priceType) || "Enter pricing above"}
                  </div>
                  <p className="mt-1 text-xs text-muted">Enter numbers only. The selected L/Cr unit is applied automatically.</p>
                  <FieldError message={errors.priceDisplay} />
                </div>
              </div>

              <div>
                <FieldLabel optional>Price Note</FieldLabel>
                <TextArea
                  value={form.priceNote}
                  onChange={(v) => set("priceNote", v)}
                  placeholder="e.g. Price may vary based on floor, facing and availability."
                  rows={2}
                />
              </div>

              <div className="border-t border-line pt-5">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-ink">Pricing &amp; Configurations</p>
                  <p className="mt-1 text-xs text-muted">Add the actual configurations customers can choose from.</p>
                </div>
                <div className="space-y-3">
                  {configurations.map((row, index) => (
                    <div key={row.id ?? index} className="rounded-xl border border-line bg-surface/60 p-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                        <TextInput value={row.configuration} onChange={(v) => updateConfigurations(configurations.map((r,i)=>i===index?{...r,configuration:v}:r))} placeholder={isPlot ? "e.g. 30 × 40 Plot" : "e.g. 2 BHK"} />
                        <div className="relative">
                          <TextInput value={row.area} onChange={(v) => updateConfigurations(configurations.map((r,i)=>i===index?{...r,area:v.replace(/[^0-9.]/g,"")}:r))} placeholder="e.g. 1200" />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">sq.ft.</span>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_78px] gap-2">
                          <TextInput value={row.price} onChange={(v) => updateConfigurations(configurations.map((r,i)=>i===index?{...r,price:v.replace(/[^0-9.]/g,"")}:r))} placeholder="e.g. 85" />
                          <SelectInput value={row.priceUnit} onChange={(v) => updateConfigurations(configurations.map((r,i)=>i===index?{...r,priceUnit:v}:r))} placeholder="Unit" options={["L","Cr"].map((u)=>({value:u,label:u}))} />
                        </div>
                        <TextInput value={row.availability} onChange={(v) => updateConfigurations(configurations.map((r,i)=>i===index?{...r,availability:v}:r))} placeholder="Available" />
                        <button type="button" onClick={() => updateConfigurations(configurations.filter((_,i)=>i!==index))} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Remove</button>
                      </div>
                      <p className="mt-2 text-xs text-muted">{row.configuration || "Configuration"} · {formatConfigurationArea(row.area) || "Area"} · {formatConfigurationPrice(row.price, row.priceUnit) || "Price"} · {row.availability || "Availability"}</p>
                    </div>
                  ))}
                  <button type="button" onClick={() => updateConfigurations([...configurations, { configuration: "", area: "", price: "", priceUnit: form.priceUnit || "L", availability: "Available", sortOrder: String(configurations.length) }])} className="text-sm font-semibold text-gold hover:underline">+ Add Configuration</button>
                </div>
                <FieldError message={errors.configurations} />
              </div>
            </SectionCard>

            {/* 3. Project Overview */}
            <SectionCard
              id="section-overview"
              number={3}
              title="Project Overview"
              description="Add key details about the project."
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <FieldLabel required>Project Size</FieldLabel>
                  <div className="grid grid-cols-[minmax(0,1fr)_130px] gap-2">
                    <TextInput
                      value={form.projectSize}
                      onChange={(v) => set("projectSize", v.replace(/[^0-9.]/g, ""))}
                      placeholder="e.g. 12.5"
                      error={errors.projectSize}
                    />
                    <SelectInput
                      value={form.projectSizeUnit}
                      onChange={(v) => set("projectSizeUnit", v)}
                      placeholder="Unit"
                      options={["Acres", "Guntas", "Cents", "Sq Ft"].map((u) => ({ value: u, label: u }))}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">{formatProjectSize(form.projectSize, form.projectSizeUnit) || "Enter the project size"}</p>
                  <FieldError message={errors.projectSize} />
                </div>
                {isApartment && (
                  <>
                    <div>
                      <FieldLabel required>Total Units</FieldLabel>
                      <div className="relative">
                        <TextInput
                          value={form.totalUnits}
                          onChange={(v) => set("totalUnits", v.replace(/[^0-9.]/g, ""))}
                          placeholder="e.g. 500"
                          error={errors.totalUnits}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Units</span>
                      </div>
                      <FieldError message={errors.totalUnits} />
                    </div>
                    <div>
                      <FieldLabel required>Available Units</FieldLabel>
                      <div className="relative">
                        <TextInput
                          value={form.availableUnits}
                          onChange={(v) => set("availableUnits", v.replace(/[^0-9.]/g, ""))}
                          placeholder="e.g. 120"
                          error={errors.availableUnits}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Units</span>
                      </div>
                      <FieldError message={errors.availableUnits} />
                    </div>
                  </>
                )}
                {isPlot && (
                  <div>
                    <FieldLabel required>Total Plots</FieldLabel>
                    <div className="relative">
                      <TextInput
                        value={form.totalPlots}
                        onChange={(v) => set("totalPlots", v.replace(/[^0-9.]/g, ""))}
                        placeholder="e.g. 100"
                        error={errors.totalPlots}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Plots</span>
                    </div>
                    <FieldError message={errors.totalPlots} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <FieldLabel required>Possession / Availability Date</FieldLabel>
                  <TextInput type="date" value={form.possessionDate} onChange={(v) => set("possessionDate", v)} error={errors.possessionDate} />
                  <FieldError message={errors.possessionDate} />
                </div>
                <div>
                  <FieldLabel required>Availability</FieldLabel>
                  <TextInput
                    value={form.availability}
                    onChange={(v) => set("availability", v)}
                    placeholder="e.g. Booking Open"
                    error={errors.availability}
                  />
                  <FieldError message={errors.availability} />
                </div>
                <div>
                  <FieldLabel optional>RERA Number</FieldLabel>
                  <TextInput
                    value={form.reraNumber}
                    onChange={(v) => set("reraNumber", v)}
                    placeholder="e.g. PRM/KA/RERA/1251/446/2023"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <FieldLabel optional>RERA URL</FieldLabel>
                  <TextInput
                    value={form.reraUrl}
                    onChange={(v) => set("reraUrl", v)}
                    placeholder="https://rera.karnataka.gov.in/"
                  />
                </div>
                <div>
                  <FieldLabel optional>Launch Date</FieldLabel>
                  <TextInput
                    type="date"
                    value={form.launchDate}
                    onChange={(v) => set("launchDate", v)}
                  />
                </div>
                <div>
                  <FieldLabel optional>Completion Date</FieldLabel>
                  <TextInput
                    type="date"
                    value={form.completionDate}
                    onChange={(v) => set("completionDate", v)}
                  />
                </div>
              </div>
            </SectionCard>

            {/* 4. Property Details (type-conditional) */}
            <SectionCard
              id="section-details"
              number={4}
              title="Property Details"
              description={
                form.propertyType
                  ? `Fields specific to ${form.propertyType} listings.`
                  : "Select a property type in Basic Information to see relevant fields."
              }
            >
              {isApartment && (
                <>
                  <div>
                    <FieldLabel required>BHK Options</FieldLabel>
                    <TagListInput
                      values={form.bhkOptions}
                      onChange={(v) => set("bhkOptions", v)}
                      placeholder="e.g. 2 BHK"
                    />
                    <FieldError message={errors.bhkOptions} />
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel required>Configuration</FieldLabel>
                      <TextInput
                        value={form.configuration}
                        onChange={(v) => set("configuration", v)}
                        placeholder="e.g. 2, 3 BHK Apartments"
                        error={errors.configuration}
                      />
                      <FieldError message={errors.configuration} />
                    </div>
                    <div>
                      <FieldLabel required>Area Range</FieldLabel>
                      <TextInput
                        value={form.areaRange}
                        onChange={(v) => set("areaRange", v)}
                        placeholder="e.g. 1200 - 2400 sq.ft"
                        error={errors.areaRange}
                      />
                      <FieldError message={errors.areaRange} />
                    </div>
                  </div>
                </>
              )}

              {isPlot && (
                <>
                  <div>
                    <FieldLabel required>Plot Sizes</FieldLabel>
                    <TagListInput
                      values={form.plotSizes}
                      onChange={(v) => set("plotSizes", v)}
                      placeholder="e.g. 1200 sq.ft"
                    />
                    <FieldError message={errors.plotSizes} />
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel required>Area</FieldLabel>
                      <TextInput
                        value={form.area}
                        onChange={(v) => set("area", v)}
                        placeholder="e.g. 5"
                        error={errors.area}
                      />
                      <FieldError message={errors.area} />
                    </div>
                    <div>
                      <FieldLabel>Area Unit</FieldLabel>
                      <SelectInput
                        value={form.areaUnit}
                        onChange={(v) => set("areaUnit", v)}
                        placeholder="Select unit"
                        options={AREA_UNITS.map((u) => ({
                          value: u,
                          label: u,
                        }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {!form.propertyType && (
                <p className="text-sm text-muted">
                  No property type selected yet.
                </p>
              )}
            </SectionCard>

            {/* 5. Highlights & Amenities */}
            <SectionCard
              id="section-highlights"
              number={5}
              title="Highlights & Amenities"
              description="Add the standout features and amenities for this project."
            >
              <div>
                <FieldLabel required>Highlights</FieldLabel>
                <TagListInput
                  values={form.highlights}
                  onChange={(v) => set("highlights", v)}
                  placeholder="e.g. Lakefront clubhouse"
                />
                <p className="mt-2 text-xs text-muted">Quick add from the Prestige Lakeside Habitat reference:</p>
                <PresetPicker
                  options={HIGHLIGHT_PRESETS}
                  values={form.highlights}
                  onToggle={(value) => set("highlights", toggleValue(form.highlights, value))}
                />
              </div>
              <div>
                <FieldLabel required>Amenities</FieldLabel>
                <TagListInput values={form.amenities} onChange={(v) => set("amenities", v)} placeholder="e.g. Swimming Pool" />
                <FieldError message={errors.amenities} />
                <p className="mt-2 text-xs text-muted">Quick add common amenities:</p>
                <PresetPicker
                  options={AMENITY_PRESETS}
                  values={form.amenities}
                  onToggle={(value) => set("amenities", toggleValue(form.amenities, value))}
                />
              </div>
            </SectionCard>

            {/* 6. Images & Documents */}
            <SectionCard
              id="section-images"
              number={6}
              title="Images & Documents"
              description="Upload project photos. The hero image is shown first on the listing and project page."
            >
              <div>
                <FieldLabel required>Project Images</FieldLabel>
                <ProjectImagesField
                  items={images}
                  onItemsChange={setImages}
                  onRemoveSaved={(removed) =>
                    setRemovedImages((prev) => [...prev, removed])
                  }
                  disabled={isBusy}
                />
                <FieldError message={errors.images} />
              </div>

              <div className="border-t border-line pt-5">
                <p className="mb-3 text-sm font-semibold text-ink">Brochure</p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel optional>Brochure Title</FieldLabel>
                    <TextInput
                      value={form.brochureTitle}
                      onChange={(v) => set("brochureTitle", v)}
                      placeholder="e.g. Prestige Lakeside Habitat Brochure"
                    />
                  </div>
                  <div>
                    <FieldLabel optional>Brochure Size</FieldLabel>
                    <TextInput
                      value={form.brochureSize}
                      onChange={(v) => set("brochureSize", v)}
                      placeholder="e.g. 2.4 MB"
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <FieldLabel optional>Brochure URL</FieldLabel>
                  <TextInput
                    value={form.brochureUrl}
                    onChange={(v) => set("brochureUrl", v)}
                    placeholder="https://…"
                  />
                </div>
                <div className="mt-5">
                  <ToggleSwitch
                    checked={form.brochureGated}
                    onChange={(v) => set("brochureGated", v)}
                    label="Gated Brochure"
                    description="Require a lead's contact details before download"
                  />
                </div>
              </div>
            </SectionCard>

            {/* 7. Location */}
            <SectionCard
              id="section-location"
              number={7}
              title="Location & Map"
              description="Where this project is located."
            >
              <div>
                <FieldLabel required>Address</FieldLabel>
                <TextArea
                  value={form.address}
                  onChange={(v) => set("address", v)}
                  placeholder="Enter full address"
                  rows={2}
                  error={errors.address}
                />
                <FieldError message={errors.address} />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel required>City</FieldLabel>
                  <TextInput
                    value={form.city}
                    onChange={(v) => set("city", v)}
                    error={errors.city}
                  />
                  <FieldError message={errors.city} />
                </div>
                <div>
                  <FieldLabel optional>Pincode</FieldLabel>
                  <TextInput
                    value={form.pincode}
                    onChange={(v) => set("pincode", v)}
                    placeholder="e.g. 560066"
                  />
                </div>
              </div>
              <div>
                <FieldLabel optional>Google Maps URL</FieldLabel>
                <TextInput
                  value={form.googleMapsUrl}
                  onChange={(v) => set("googleMapsUrl", v)}
                  placeholder="https://maps.google.com/…"
                />
              </div>
            </SectionCard>

            {/* 8. Nearby & Connectivity */}
            <SectionCard
              id="section-connectivity"
              number={8}
              title="Nearby & Connectivity"
              description="List notable nearby landmarks and connectivity options."
            >
              <div>
                <FieldLabel required>Nearby Landmarks</FieldLabel>
                <div className="space-y-2.5">
                  {form.nearbyLandmarks.map((row, index) => {
                    const numericDistance = row.distance.replace(/\s*(km|m|mi)$/i, "");
                    return (
                      <div key={index} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <TextInput value={row.name} onChange={(v) => set("nearbyLandmarks", form.nearbyLandmarks.map((r,i)=>i===index?{...r,name:v}:r))} placeholder="e.g. Phoenix Marketcity" />
                        <div className="relative min-w-[160px] flex-1">
                          <TextInput value={numericDistance} onChange={(v) => set("nearbyLandmarks", form.nearbyLandmarks.map((r,i)=>i===index?{...r,distance:v.replace(/[^0-9.]/g,"")}:r))} placeholder="e.g. 2.5" />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">km</span>
                        </div>
                        <button type="button" onClick={() => set("nearbyLandmarks", form.nearbyLandmarks.filter((_,i)=>i!==index))} aria-label="Remove row" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-red-600">×</button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => set("nearbyLandmarks", [...form.nearbyLandmarks, { name: "", distance: "" }])} className="text-sm font-semibold text-gold hover:underline">+ Add Landmark</button>
                </div>
                <FieldError message={errors.nearbyLandmarks} />
                <p className="mt-2 text-xs text-muted">Quick add a nearby place, then enter its distance.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {LANDMARK_PRESETS.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        set("nearbyLandmarks", [
                          ...form.nearbyLandmarks,
                          { name: label, distance: "" },
                        ])
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-semibold text-muted hover:border-gold/60 hover:bg-surface hover:text-navy"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel required>Connectivity</FieldLabel>
                <RepeatableRows
                  rows={form.connectivity}
                  onChange={(v) => set("connectivity", v)}
                  fields={[
                    {
                      key: "label",
                      placeholder: "e.g. Whitefield Metro Station",
                    },
                    { key: "info", placeholder: "e.g. 10 mins drive" },
                  ]}
                  emptyRow={{ label: "", info: "" }}
                  addLabel="Add Connectivity"
                />
                <FieldError message={errors.connectivity} />
                <p className="mt-2 text-xs text-muted">Quick add common connectivity options.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CONNECTIVITY_PRESETS.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        set("connectivity", [
                          ...form.connectivity,
                          { label, info: "" },
                        ])
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-semibold text-muted hover:border-gold/60 hover:bg-surface hover:text-navy"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </SectionCard>

            {/* 9. Publishing */}
            <SectionCard
              id="section-publishing"
              number={9}
              title="Publishing"
              description="Control visibility and ordering on the website."
            >
              <ToggleSwitch
                checked={form.isFeatured}
                onChange={(v) => set("isFeatured", v)}
                label="Featured Project"
                description="Highlight this project across the website"
              />

              <div className="max-w-xs">
                <FieldLabel optional>Sort Order</FieldLabel>
                <TextInput
                  value={form.sortOrder}
                  onChange={(v) => set("sortOrder", v)}
                  placeholder="0"
                  error={errors.sortOrder}
                />
                <FieldError message={errors.sortOrder} />
              </div>
            </SectionCard>
          </div>

        </div>
      </main>
    </>
  );
}

function validationFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: "Project Name", slug: "Slug", builderId: "Builder", localityId: "Locality", propertyType: "Property Type", status: "Project Status", description: "Project Description", priceMin: "Starting Price", priceMax: "Maximum Price", priceDisplay: "Pricing", projectSize: "Project Size", possessionDate: "Possession / Availability Date", availability: "Availability", highlights: "Highlights", amenities: "Amenities", configurations: "Pricing & Configurations", bhkOptions: "BHK Options", configuration: "Configuration", areaRange: "Area Range", totalUnits: "Total Units", availableUnits: "Available Units", plotSizes: "Plot Sizes", area: "Plot Area", totalPlots: "Total Plots", images: "Project Images", address: "Address", city: "City", nearbyLandmarks: "Nearby Landmarks", connectivity: "Connectivity", pricePerSqft: "Price per Sq.Ft", sortOrder: "Sort Order", latitude: "Latitude", longitude: "Longitude"
  };
  return labels[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function sectionIdForField(field: string): string {
  const basicFields = [
    "name",
    "slug",
    "builderId",
    "localityId",
    "propertyType",
    "status",
    "priceDisplay",
    "projectSize",
    "possessionDate",
    "availability",
    "highlights",
    "amenities",
    "bhkOptions",
    "configuration",
    "areaRange",
    "plotSizes",
    "area",
    "images",
    "address",
    "city",
    "nearbyLandmarks",
    "connectivity",
  ];
  const pricingFields = ["priceMin", "priceMax"];
  const overviewFields = ["totalUnits", "totalPlots", "availableUnits"];
  const locationFields = ["latitude", "longitude"];
  const publishingFields = ["sortOrder"];

  if (basicFields.includes(field)) return "section-basic";
  if (pricingFields.includes(field) || field === "configurations") return "section-pricing";
  if (overviewFields.includes(field)) return "section-overview";
  if (locationFields.includes(field)) return "section-location";
  if (publishingFields.includes(field)) return "section-publishing";
  return "section-basic";
}
