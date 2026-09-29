"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import type { FilterOption } from "@/lib/projects-data";
import DashboardHeader from "@/app/dashboard/components/DashboardHeader";
import {
  AREA_UNITS,
  INITIAL_FORM_STATE,
  PRICE_TYPES,
  PRICE_UNITS,
  PROPERTY_TYPES,
  STATUS_OPTIONS,
  slugify,
  type ProjectFormState,
} from "./form-types";
import { validateForm, hasErrors, type FormErrors } from "./validation";
import { buildProjectPayload, insertProject, isSlugTaken } from "./create-project";
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

interface AddProjectFormProps {
  builders: FilterOption[];
  localities: FilterOption[];
}

type SubmitMode = "draft" | "publish" | null;

export default function AddProjectForm({ builders, localities }: AddProjectFormProps) {
  const router = useRouter();
  const activeSectionId = useActiveSection(PROJECT_FORM_SECTIONS);

  const [form, setForm] = useState<ProjectFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState<SubmitMode>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  function set<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
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
    setWarning(null);

    const validationErrors = validateForm(form);
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

    const slugTaken = await isSlugTaken(supabase, form.slug.trim());
    if (slugTaken) {
      setErrors((prev) => ({ ...prev, slug: "This slug is already in use." }));
      setSubmitting(null);
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const payload = buildProjectPayload(form, mode === "publish");
    const result = await insertProject(supabase, payload);

    setSubmitting(null);

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong while saving the project.");
      return;
    }

    if (result.droppedColumns.length > 0) {
      // Still a success — just let the admin know a few fields weren't
      // stored because those columns don't exist in the database yet.
      setWarning(
        `Project saved, but these fields could not be stored (column not found in the database): ${result.droppedColumns.join(", ")}.`
      );
      setTimeout(() => router.push("/dashboard/projects"), 2000);
      return;
    }

    router.push("/dashboard/projects");
  }

  const isApartment = form.propertyType === "Apartment";
  const isPlot = form.propertyType === "Plot";
  const isBusy = submitting !== null;

  return (
    <>
      <DashboardHeader
        title="Add Project"
        subtitle="Create a new property project for the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
        backHref="/dashboard/projects"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/projects")}
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
              Publish Project
            </button>
          </div>
        }
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr_260px]">
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <FormSectionNav sections={PROJECT_FORM_SECTIONS} activeId={activeSectionId} />
        </div>
      </div>

      <div className="space-y-5">
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
              <FieldLabel>Slug</FieldLabel>
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
                options={builders.map((b) => ({ value: b.id, label: b.name }))}
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
                options={localities.map((l) => ({ value: l.id, label: l.name }))}
                error={errors.localityId}
              />
              <FieldError message={errors.localityId} />
            </div>

            <div>
              <FieldLabel required>Property Type</FieldLabel>
              <RadioPillGroup
                value={form.propertyType}
                onChange={(v) => set("propertyType", v as ProjectFormState["propertyType"])}
                options={[...PROPERTY_TYPES]}
              />
              <FieldError message={errors.propertyType} />
            </div>
            <div>
              <FieldLabel required>Project Status</FieldLabel>
              <SelectInput
                value={form.status}
                onChange={(v) => set("status", v)}
                placeholder="Select status"
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                error={errors.status}
              />
              <FieldError message={errors.status} />
            </div>
          </div>

          <div>
            <FieldLabel>Short Description</FieldLabel>
            <TextArea
              value={form.shortDescription}
              onChange={(v) => set("shortDescription", v)}
              placeholder="Enter a short description (max 200 characters)"
              rows={2}
              maxLength={200}
            />
          </div>

          <div>
            <FieldLabel>Full Description</FieldLabel>
            <TextArea
              value={form.description}
              onChange={(v) => set("description", v)}
              placeholder="Enter detailed project description…"
              rows={6}
            />
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
            <FieldLabel>Price Type</FieldLabel>
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
                <div>
                  <FieldLabel>Display Unit</FieldLabel>
                  <SelectInput
                    value={form.priceUnit}
                    onChange={(v) => set("priceUnit", v)}
                    placeholder="Unit"
                    options={PRICE_UNITS.map((u) => ({ value: u, label: u }))}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel optional>Price per Sq.Ft</FieldLabel>
              <TextInput
                value={form.pricePerSqft}
                onChange={(v) => set("pricePerSqft", v)}
                placeholder="e.g. 4500"
              />
            </div>
            <div>
              <FieldLabel optional>Custom Price Display Text</FieldLabel>
              <TextInput
                value={form.priceDisplay}
                onChange={(v) => set("priceDisplay", v)}
                placeholder="e.g. ₹1.2 Cr – ₹2.5 Cr"
              />
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
              <FieldLabel optional>Project Size</FieldLabel>
              <TextInput
                value={form.projectSize}
                onChange={(v) => set("projectSize", v)}
                placeholder="e.g. 5 Acres"
              />
            </div>
            {isApartment && (
              <>
                <div>
                  <FieldLabel optional>Total Units</FieldLabel>
                  <TextInput
                    value={form.totalUnits}
                    onChange={(v) => set("totalUnits", v)}
                    placeholder="e.g. 500"
                    error={errors.totalUnits}
                  />
                  <FieldError message={errors.totalUnits} />
                </div>
                <div>
                  <FieldLabel optional>Available Units</FieldLabel>
                  <TextInput
                    value={form.availableUnits}
                    onChange={(v) => set("availableUnits", v)}
                    placeholder="e.g. 120"
                    error={errors.availableUnits}
                  />
                  <FieldError message={errors.availableUnits} />
                </div>
              </>
            )}
            {isPlot && (
              <div>
                <FieldLabel optional>Total Plots</FieldLabel>
                <TextInput
                  value={form.totalPlots}
                  onChange={(v) => set("totalPlots", v)}
                  placeholder="e.g. 100"
                  error={errors.totalPlots}
                />
                <FieldError message={errors.totalPlots} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel optional>Possession Date</FieldLabel>
              <TextInput
                type="date"
                value={form.possessionDate}
                onChange={(v) => set("possessionDate", v)}
              />
            </div>
            <div>
              <FieldLabel optional>Availability</FieldLabel>
              <TextInput
                value={form.availability}
                onChange={(v) => set("availability", v)}
                placeholder="e.g. Booking Open"
              />
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
                <FieldLabel optional>BHK Options</FieldLabel>
                <TagListInput
                  values={form.bhkOptions}
                  onChange={(v) => set("bhkOptions", v)}
                  placeholder="e.g. 2 BHK"
                />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel optional>Configuration</FieldLabel>
                  <TextInput
                    value={form.configuration}
                    onChange={(v) => set("configuration", v)}
                    placeholder="e.g. 2, 3 BHK Apartments"
                  />
                </div>
                <div>
                  <FieldLabel optional>Area Range</FieldLabel>
                  <TextInput
                    value={form.areaRange}
                    onChange={(v) => set("areaRange", v)}
                    placeholder="e.g. 1200 - 2400 sq.ft"
                  />
                </div>
              </div>
            </>
          )}

          {isPlot && (
            <>
              <div>
                <FieldLabel optional>Plot Sizes</FieldLabel>
                <TagListInput
                  values={form.plotSizes}
                  onChange={(v) => set("plotSizes", v)}
                  placeholder="e.g. 1200 sq.ft"
                />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel optional>Area</FieldLabel>
                  <TextInput
                    value={form.area}
                    onChange={(v) => set("area", v)}
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <FieldLabel>Area Unit</FieldLabel>
                  <SelectInput
                    value={form.areaUnit}
                    onChange={(v) => set("areaUnit", v)}
                    placeholder="Select unit"
                    options={AREA_UNITS.map((u) => ({ value: u, label: u }))}
                  />
                </div>
              </div>
            </>
          )}

          {!form.propertyType && (
            <p className="text-sm text-muted">No property type selected yet.</p>
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
            <FieldLabel optional>Highlights</FieldLabel>
            <TagListInput
              values={form.highlights}
              onChange={(v) => set("highlights", v)}
              placeholder="e.g. Lakefront clubhouse"
            />
          </div>
          <div>
            <FieldLabel optional>Amenities</FieldLabel>
            <TagListInput
              values={form.amenities}
              onChange={(v) => set("amenities", v)}
              placeholder="e.g. Swimming Pool"
            />
          </div>
        </SectionCard>

        {/* 6. Images & Documents */}
        <SectionCard
          id="section-images"
          number={6}
          title="Images & Documents"
          description="Image uploads will be available once Supabase Storage is connected."
        >
          <div>
            <FieldLabel>Hero Image</FieldLabel>
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface py-10 text-center">
              <ImagePlus className="h-6 w-6 text-gray-300" />
              <p className="text-sm font-medium text-muted">Image upload coming soon</p>
              <p className="text-xs text-gray-300">Will connect to Supabase Storage</p>
            </div>
          </div>

          <div>
            <FieldLabel>Gallery Images</FieldLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface"
                >
                  <ImagePlus className="h-5 w-5 text-gray-300" />
                </div>
              ))}
            </div>
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
            <FieldLabel optional>Address</FieldLabel>
            <TextArea
              value={form.address}
              onChange={(v) => set("address", v)}
              placeholder="Enter full address"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel>City</FieldLabel>
              <TextInput value={form.city} onChange={(v) => set("city", v)} />
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel optional>Latitude</FieldLabel>
              <TextInput
                value={form.latitude}
                onChange={(v) => set("latitude", v)}
                placeholder="e.g. 12.9698"
                error={errors.latitude}
              />
              <FieldError message={errors.latitude} />
            </div>
            <div>
              <FieldLabel optional>Longitude</FieldLabel>
              <TextInput
                value={form.longitude}
                onChange={(v) => set("longitude", v)}
                placeholder="e.g. 77.7500"
                error={errors.longitude}
              />
              <FieldError message={errors.longitude} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel optional>Google Maps URL</FieldLabel>
              <TextInput
                value={form.googleMapsUrl}
                onChange={(v) => set("googleMapsUrl", v)}
                placeholder="https://maps.google.com/…"
              />
            </div>
            <div>
              <FieldLabel optional>Map Embed URL</FieldLabel>
              <TextInput
                value={form.mapEmbedUrl}
                onChange={(v) => set("mapEmbedUrl", v)}
                placeholder="https://www.google.com/maps/embed?…"
              />
            </div>
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
            <FieldLabel optional>Nearby Landmarks</FieldLabel>
            <RepeatableRows
              rows={form.nearbyLandmarks}
              onChange={(v) => set("nearbyLandmarks", v)}
              fields={[
                { key: "name", placeholder: "e.g. Phoenix Marketcity" },
                { key: "distance", placeholder: "e.g. 2.5 km" },
              ]}
              emptyRow={{ name: "", distance: "" }}
              addLabel="Add Landmark"
            />
          </div>

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

      <div className="hidden lg:block">
        <div className="sticky top-6">
          <FormProgressPanel sections={PROJECT_FORM_SECTIONS} activeId={activeSectionId} />
        </div>
      </div>
        </div>
      </main>
    </>
  );
}

function sectionIdForField(field: string): string {
  const basicFields = ["name", "slug", "builderId", "localityId", "propertyType", "status"];
  const pricingFields = ["priceMin", "priceMax"];
  const overviewFields = ["totalUnits", "totalPlots", "availableUnits"];
  const locationFields = ["latitude", "longitude"];
  const publishingFields = ["sortOrder"];

  if (basicFields.includes(field)) return "section-basic";
  if (pricingFields.includes(field)) return "section-pricing";
  if (overviewFields.includes(field)) return "section-overview";
  if (locationFields.includes(field)) return "section-location";
  if (publishingFields.includes(field)) return "section-publishing";
  return "section-basic";
}
