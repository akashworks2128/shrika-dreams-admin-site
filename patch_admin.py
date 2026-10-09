from pathlib import Path
root=Path('/mnt/data/admin_fix')

def write(rel, s):
    (root/rel).write_text(s)

def replace(rel, old, new, count=None):
    p=root/rel; s=p.read_text()
    if old not in s:
        raise SystemExit(f'MISSING in {rel}: {old[:120]}')
    if count is None:
        s=s.replace(old,new)
    else:
        s=s.replace(old,new,count)
    p.write_text(s)

# ---------------- Builder: add public-facing fields + unified publish flow ----------------
write('src/app/dashboard/builders/new/components/form-types.ts', '''export interface BuilderFormState {
  name: string;
  slug: string;
  slugTouched: boolean;

  tagline: string;
  logoUrl: string;
  imageUrl: string;

  shortDescription: string;
  about: string;

  websiteUrl: string;
  foundedYear: string;
  headquarters: string;
  yearsExperience: string;
  projectsCount: string;
}

export const INITIAL_BUILDER_FORM_STATE: BuilderFormState = {
  name: "",
  slug: "",
  slugTouched: false,

  tagline: "",
  logoUrl: "",
  imageUrl: "",

  shortDescription: "",
  about: "",

  websiteUrl: "",
  foundedYear: "",
  headquarters: "",
  yearsExperience: "",
  projectsCount: "",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\\s-]/g, "")
    .replace(/\\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
''')

write('src/app/dashboard/builders/new/components/validation.ts', '''import type { BuilderFormState } from "./form-types";

export type FormErrors = Partial<Record<keyof BuilderFormState, string>>;

function isValidNumber(value: string): boolean {
  if (!value) return true;
  return !Number.isNaN(Number(value));
}

export function validateForm(form: BuilderFormState, forPublish = false): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = "Builder name is required.";
  if (!form.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  }

  if (form.foundedYear && !isValidNumber(form.foundedYear)) {
    errors.foundedYear = "Enter a valid year.";
  } else if (form.foundedYear) {
    const year = Number(form.foundedYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1800 || year > currentYear) {
      errors.foundedYear = `Enter a year between 1800 and ${currentYear}.`;
    }
  }

  if (forPublish) {
    if (!form.tagline.trim()) errors.tagline = "Tagline is required to publish.";
    if (!form.headquarters.trim()) errors.headquarters = "Headquarters is required to publish.";
    if (!form.foundedYear.trim()) errors.foundedYear = "Founded year is required to publish.";
    if (!form.yearsExperience.trim()) errors.yearsExperience = "Years of experience is required to publish.";
    if (!form.projectsCount.trim()) errors.projectsCount = "Projects count is required to publish.";
    if (!form.shortDescription.trim()) errors.shortDescription = "Short description is required to publish.";
    if (!form.about.trim()) errors.about = "About is required to publish.";
    if (!form.logoUrl.trim()) errors.logoUrl = "Builder logo is required to publish.";
    if (!form.imageUrl.trim()) errors.imageUrl = "Builder hero image is required to publish.";
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}
''')

write('src/app/dashboard/builders/new/components/create-builder.ts', '''import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuilderFormState } from "./form-types";

function toStringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

export function buildBuilderPayload(
  form: BuilderFormState,
  isPublished: boolean
): Record<string, unknown> {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    tagline: toStringOrNull(form.tagline),
    logo_url: toStringOrNull(form.logoUrl),
    image_url: toStringOrNull(form.imageUrl),
    short_description: toStringOrNull(form.shortDescription),
    about: toStringOrNull(form.about),
    website_url: toStringOrNull(form.websiteUrl),
    founded_year: toIntOrNull(form.foundedYear),
    headquarters: toStringOrNull(form.headquarters),
    years_experience: toStringOrNull(form.yearsExperience),
    projects_count: toStringOrNull(form.projectsCount),
    is_published: isPublished,
  };
}

export interface InsertBuilderResult {
  success: boolean;
  builderId?: string;
  error?: string;
}

export async function insertBuilder(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<InsertBuilderResult> {
  try {
    const builderId = crypto.randomUUID();
    const { error } = await supabase.from("builders").insert({ ...payload, id: builderId });
    if (error) return { success: false, error: error.message };
    return { success: true, builderId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateBuilder(
  supabase: SupabaseClient,
  builderId: string,
  payload: Record<string, unknown>
): Promise<InsertBuilderResult> {
  try {
    const { error } = await supabase.from("builders").update(payload).eq("id", builderId);
    if (error) return { success: false, error: error.message };
    return { success: true, builderId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function isSlugTaken(
  supabase: SupabaseClient,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase.from("builders").select("id").eq("slug", slug);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    console.error("[create-builder] slug check failed:", error.message);
    return false;
  }
  return Boolean(data);
}
''')

# Builder form: replace imports/form submit/header/sections.
p='src/app/dashboard/builders/new/components/AddBuilderForm.tsx'
s=(root/p).read_text()
s=s.replace('import { AlertTriangle, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";', 'import { AlertTriangle, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";')
s=s.replace('const STATUS_OPTIONS = ["Draft", "Published"] as const;\n\n', '')
s=s.replace('  const [submitting, setSubmitting] = useState(false);', '  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);')
s=s.replace('  async function handleSubmit() {\n    if (submitting || success) return; // prevent duplicate submission', '  async function handleSubmit(mode: "draft" | "publish") {\n    if (submitting || success) return; // prevent duplicate submission')
s=s.replace('    const validationErrors = validateForm(form);', '    const validationErrors = validateForm(form, mode === "publish");')
s=s.replace('    const payload = buildBuilderPayload(form);', '    const payload = buildBuilderPayload(form, mode === "publish");')
s=s.replace('    setSubmitting(false);', '    setSubmitting(null);')
s=s.replace('  const isBusy = submitting || success;', '  const isBusy = submitting !== null || success;')
old='''          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">\n            <button\n              type="button"\n              onClick={() => router.push("/dashboard/builders")}\n              disabled={isBusy}\n              className="min-w-0 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50 sm:px-4"\n            >\n              Cancel\n            </button>\n            <button\n              type="button"\n              onClick={handleSubmit}\n              disabled={isBusy}\n              className="col-span-2 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 sm:col-span-1 sm:px-4"\n            >\n              {isBusy ? (\n                <Loader2 className="h-4 w-4 animate-spin" />\n              ) : (\n                <CheckCircle2 className="h-4 w-4" />\n              )}\n              {builderId ? "Save Changes" : "Add Builder"}\n            </button>\n          </div>'''
new='''          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">\n            <button type="button" onClick={() => router.push("/dashboard/builders")} disabled={isBusy} className="min-w-0 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50 sm:px-4">Cancel</button>\n            <button type="button" onClick={() => handleSubmit("draft")} disabled={isBusy} className="flex min-w-0 items-center justify-center gap-2 rounded-lg border border-gold px-3 py-2.5 text-sm font-semibold text-gold hover:bg-gold-light/20 disabled:opacity-50 sm:px-4">\n              {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}\n              Save as Draft\n            </button>\n            <button type="button" onClick={() => handleSubmit("publish")} disabled={isBusy} className="col-span-2 flex min-w-0 items-center justify-center gap-2 rounded-lg bg-gold px-3 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 sm:col-span-1 sm:px-4">\n              {submitting === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}\n              Publish Builder\n            </button>\n          </div>'''
if old not in s: raise SystemExit('builder header old not found')
s=s.replace(old,new)
s=s.replace('''          {/* 1. Basic Information */}''','''          {/* 1. Basic Information */}''')
# add tagline + metrics and required labels
s=s.replace('''              <div>\n                <FieldLabel optional>Headquarters</FieldLabel>''','''              <div>\n                <FieldLabel required>Headquarters</FieldLabel>''')
s=s.replace('''              <div>\n                <FieldLabel optional>Founded Year</FieldLabel>''','''              <div>\n                <FieldLabel required>Founded Year</FieldLabel>''')
s=s.replace('''                  error={errors.foundedYear}\n                  disabled={isBusy}\n                />''','''                  error={errors.foundedYear}\n                  disabled={isBusy}\n                />''',1)
s=s.replace('''              <div className="sm:col-span-2">\n                <FieldLabel optional>Website URL</FieldLabel>''','''              <div className="sm:col-span-2">\n                <FieldLabel optional>Website URL</FieldLabel>''')
s=s.replace('''            <div>\n              <FieldLabel optional>Short Description</FieldLabel>''','''            <div>\n              <FieldLabel required>Tagline</FieldLabel>\n              <TextInput value={form.tagline} onChange={(v) => set("tagline", v)} placeholder="e.g. Building better homes for modern India" error={errors.tagline} disabled={isBusy} />\n              <FieldError message={errors.tagline} />\n            </div>\n\n            <div>\n              <FieldLabel required>Short Description</FieldLabel>''')
s=s.replace('''                maxLength={200}\n              />''','''                maxLength={200}\n                error={errors.shortDescription}\n              />\n              <FieldError message={errors.shortDescription} />''',1)
s=s.replace('''            <div>\n              <FieldLabel optional>About</FieldLabel>''','''            <div>\n              <FieldLabel required>About</FieldLabel>''')
s=s.replace('''                placeholder="Enter a detailed description of this builder…"\n                rows={5}\n              />''','''                placeholder="Enter a detailed description of this builder…"\n                rows={5}\n                error={errors.about}\n              />\n              <FieldError message={errors.about} />''')
# insert metrics after headquarters/founded block before website
needle='''              <div className="sm:col-span-2">\n                <FieldLabel optional>Website URL</FieldLabel>'''
insert='''              <div>\n                <FieldLabel required>Years of Experience</FieldLabel>\n                <TextInput value={form.yearsExperience} onChange={(v) => set("yearsExperience", v)} placeholder="e.g. 38+ Years" error={errors.yearsExperience} disabled={isBusy} />\n                <FieldError message={errors.yearsExperience} />\n              </div>\n              <div>\n                <FieldLabel required>Projects Count</FieldLabel>\n                <TextInput value={form.projectsCount} onChange={(v) => set("projectsCount", v)} placeholder="e.g. 300+ Projects" error={errors.projectsCount} disabled={isBusy} />\n                <FieldError message={errors.projectsCount} />\n              </div>\n\n'''+needle
s=s.replace(needle,insert)
# images section title + required labels and errors
s=s.replace('''          {/* 2. Images & Status */}\n          <SectionCard\n            id="section-images-status"\n            number={2}\n            title="Images & Status"\n            description="Upload builder images and control visibility on the website."''','''          {/* 2. Images */}\n          <SectionCard\n            id="section-images"\n            number={2}\n            title="Images"\n            description="Add the logo and hero image used across the public builder pages."''')
s=s.replace('<FieldLabel optional>{label}</FieldLabel>', '<FieldLabel required={label === "Logo" || label === "Image"}>{label}</FieldLabel>',1)
# attach errors after ImageUploadField blocks by adding prop unsupported? easier add error text under section inputs via labels isn't enough.
s=s.replace('''                disabled={isBusy}\n              />\n              <ImageUploadField''','''                disabled={isBusy}\n              />\n              {errors.logoUrl && <FieldError message={errors.logoUrl} />}\n              <ImageUploadField''',1)
s=s.replace('''                disabled={isBusy}\n              />\n            </div>\n            <p className="text-xs text-muted">''','''                disabled={isBusy}\n              />\n              {errors.imageUrl && <FieldError message={errors.imageUrl} />}\n            </div>\n            <p className="text-xs text-muted">''',1)
# remove status block entirely and replace with publishing note
start=s.find('''            <div className="max-w-xs">\n              <FieldLabel required>Status</FieldLabel>''')
if start!=-1:
    end=s.find('''            </div>\n          </SectionCard>''', start)+len('''            </div>''')
    s=s[:start]+'''            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Use <span className="font-semibold text-ink">Save as Draft</span> while preparing the builder. Use <span className="font-semibold text-ink">Publish Builder</span> when all required fields are complete.</p>'''+s[end:]
# add tips banner after server/success? easiest before grid
needle='''          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">'''
s=s.replace(needle,'''          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">Fields marked <span className="font-bold text-red-500">*</span> are required to publish. You can save a draft any time.</p>\n\n'''+needle,1)
(root/p).write_text(s)

# Builder edit mapping
p='src/app/dashboard/builders/[id]/edit/builder-to-form.ts'
s=(root/p).read_text()
s=s.replace('''  slug: string | null;\n  logo_url: string | null;''','''  slug: string | null;\n  tagline: string | null;\n  logo_url: string | null;''')
s=s.replace('''  headquarters: string | null;\n  is_published''','''  headquarters: string | null;\n  years_experience: string | null;\n  projects_count: string | null;\n  is_published''')
s=s.replace('''    logoUrl: row.logo_url ?? "",''','''    tagline: row.tagline ?? "",\n    logoUrl: row.logo_url ?? "",''')
s=s.replace('''    headquarters: row.headquarters ?? "",\n\n    status: row.is_published ? "Published" : "Draft",''','''    headquarters: row.headquarters ?? "",\n    yearsExperience: row.years_experience ?? "",\n    projectsCount: row.projects_count ?? "",''')
(root/p).write_text(s)

# Builder data comments and filter status remain fine; no form status.

# ---------------- Locality: expose all public-facing fields ----------------
write('src/app/dashboard/localities/new/components/form-types.ts', '''export interface ConnectivityRow { [key: string]: string; label: string; info: string; }
export interface InfrastructureRow { [key: string]: string; label: string; info: string; }
export interface PriceTrendRow { [key: string]: string; period: string; price: string; }
export interface WhyBuyRow { [key: string]: string; label: string; info: string; }

export interface LocalityFormState {
  name: string;
  slug: string;
  slugTouched: boolean;
  city: string;

  shortDescription: string;
  fullDescription: string;
  averagePrice: string;
  priceRange: string;
  popularBhk: string;
  activeProjects: string;
  aboutTitle: string;
  aboutDescription: string;

  connectivity: ConnectivityRow[];
  infrastructure: InfrastructureRow[];
  priceTrends: PriceTrendRow[];
  whyBuy: WhyBuyRow[];

  heroImageUrl: string;
  mainImageUrl: string;
  aboutImageUrl: string;
}

export const INITIAL_LOCALITY_FORM_STATE: LocalityFormState = {
  name: "",
  slug: "",
  slugTouched: false,
  city: "Bangalore",
  shortDescription: "",
  fullDescription: "",
  averagePrice: "",
  priceRange: "",
  popularBhk: "",
  activeProjects: "",
  aboutTitle: "",
  aboutDescription: "",
  connectivity: [],
  infrastructure: [],
  priceTrends: [],
  whyBuy: [],
  heroImageUrl: "",
  mainImageUrl: "",
  aboutImageUrl: "",
};

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9\\s-]/g, "").replace(/\\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
''')
write('src/app/dashboard/localities/new/components/validation.ts', '''import type { LocalityFormState } from "./form-types";
export type FormErrors = Partial<Record<keyof LocalityFormState, string>>;

export function validateForm(form: LocalityFormState, forPublish = false): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Locality name is required.";
  if (!form.slug.trim()) errors.slug = "Slug is required.";
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  if (!form.city.trim()) errors.city = "City is required.";

  if (forPublish) {
    if (!form.shortDescription.trim()) errors.shortDescription = "Short description is required to publish.";
    if (!form.fullDescription.trim()) errors.fullDescription = "Full description is required to publish.";
    if (!form.averagePrice.trim()) errors.averagePrice = "Average price is required to publish.";
    if (!form.priceRange.trim()) errors.priceRange = "Price range is required to publish.";
    if (!form.popularBhk.trim()) errors.popularBhk = "Popular BHK is required to publish.";
    if (!form.aboutTitle.trim()) errors.aboutTitle = "About title is required to publish.";
    if (!form.aboutDescription.trim()) errors.aboutDescription = "About description is required to publish.";
    if (form.infrastructure.filter(r => r.label.trim() && r.info.trim()).length === 0) errors.infrastructure = "Add at least one infrastructure / nearby point to publish.";
    if (form.connectivity.filter(r => r.label.trim() && r.info.trim()).length === 0) errors.connectivity = "Add at least one connectivity point to publish.";
    if (form.priceTrends.filter(r => r.period.trim() && r.price.trim()).length === 0) errors.priceTrends = "Add at least one price trend to publish.";
    if (form.whyBuy.filter(r => r.label.trim() && r.info.trim()).length === 0) errors.whyBuy = "Add at least one reason to buy to publish.";
    if (!form.heroImageUrl.trim()) errors.heroImageUrl = "Hero image is required to publish.";
    if (!form.mainImageUrl.trim()) errors.mainImageUrl = "Main image is required to publish.";
    if (!form.aboutImageUrl.trim()) errors.aboutImageUrl = "About image is required to publish.";
  }
  return errors;
}
export function hasErrors(errors: FormErrors): boolean { return Object.keys(errors).length > 0; }
''')

p='src/app/dashboard/localities/new/components/create-locality.ts'
s=(root/p).read_text()
s=s.replace('''    short_description: toStringOrNull(form.shortDescription),\n    full_description: toStringOrNull(form.fullDescription),''','''    short_description: toStringOrNull(form.shortDescription),\n    full_description: toStringOrNull(form.fullDescription),\n    average_price: toStringOrNull(form.averagePrice),\n    price_range: toStringOrNull(form.priceRange),\n    popular_bhk: toStringOrNull(form.popularBhk),\n    active_projects: Number.isFinite(Number(form.activeProjects)) ? Math.max(0, Math.trunc(Number(form.activeProjects))) : 0,\n    about_title: toStringOrNull(form.aboutTitle),\n    about_description: toStringOrNull(form.aboutDescription),''')
(root/p).write_text(s)

p='src/app/dashboard/localities/[id]/edit/locality-to-form.ts'
s=(root/p).read_text()
s=s.replace('''  short_description: string | null;\n  full_description: string | null;''','''  short_description: string | null;\n  full_description: string | null;\n  average_price: string | null;\n  price_range: string | null;\n  popular_bhk: string | null;\n  active_projects: number | null;\n  about_title: string | null;\n  about_description: string | null;''')
s=s.replace('''    shortDescription: row.short_description ?? "",\n    fullDescription: row.full_description ?? "",''','''    shortDescription: row.short_description ?? "",\n    fullDescription: row.full_description ?? "",\n    averagePrice: row.average_price ?? "",\n    priceRange: row.price_range ?? "",\n    popularBhk: row.popular_bhk ?? "",\n    activeProjects: row.active_projects == null ? "" : String(row.active_projects),\n    aboutTitle: row.about_title ?? "",\n    aboutDescription: row.about_description ?? "",''')
(root/p).write_text(s)

# Locality form: progress, validation mode, fields, why buy, publish required markers/errors.
p='src/app/dashboard/localities/new/components/AddLocalityForm.tsx'
s=(root/p).read_text()
s=s.replace('''    "section-overview": hasText(form.shortDescription) || hasText(form.fullDescription),''','''    "section-overview": hasText(form.shortDescription) || hasText(form.fullDescription) || hasText(form.averagePrice) || hasText(form.priceRange) || hasText(form.popularBhk),''')
s=s.replace('''  { id: "section-connectivity", label: "Nearby & Connectivity" },\n  { id: "section-price-trends", label: "Price Trends" },\n  { id: "section-images", label: "Images" },\n  { id: "section-publishing", label: "Publishing" },''','''  { id: "section-connectivity", label: "Nearby & Connectivity" },\n  { id: "section-price-trends", label: "Price Trends" },\n  { id: "section-why-buy", label: "Why Buy" },\n  { id: "section-about", label: "About" },\n  { id: "section-images", label: "Images" },\n  { id: "section-publishing", label: "Publishing" },''')
s=s.replace('''    const validationErrors = validateForm(form);''','''    const validationErrors = validateForm(form, mode === "publish");''')
# Add required fields in overview after full description block
needle='''              <div>\n                <FieldLabel optional>Full Description</FieldLabel>\n                <TextArea\n                  value={form.fullDescription}\n                  onChange={(v) => set("fullDescription", v)}\n                  placeholder="Enter a detailed locality description…"\n                  rows={6}\n                />\n              </div>'''
insert=needle+'''\n              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">\n                <div><FieldLabel required>Average Price</FieldLabel><TextInput value={form.averagePrice} onChange={(v) => set("averagePrice", v)} placeholder="e.g. ₹6,500/sq.ft" error={errors.averagePrice} /><FieldError message={errors.averagePrice} /></div>\n                <div><FieldLabel required>Price Range</FieldLabel><TextInput value={form.priceRange} onChange={(v) => set("priceRange", v)} placeholder="e.g. ₹45L – ₹2.5Cr" error={errors.priceRange} /><FieldError message={errors.priceRange} /></div>\n                <div><FieldLabel required>Popular BHK / Plot Type</FieldLabel><TextInput value={form.popularBhk} onChange={(v) => set("popularBhk", v)} placeholder="e.g. 2 & 3 BHK" error={errors.popularBhk} /><FieldError message={errors.popularBhk} /></div>\n                <div><FieldLabel optional>Active Projects</FieldLabel><TextInput type="number" value={form.activeProjects} onChange={(v) => set("activeProjects", v)} placeholder="e.g. 25" /></div>\n              </div>'''
if needle not in s: raise SystemExit('locality overview needle missing')
s=s.replace(needle,insert)
# labels required for publish-sensitive collections
s=s.replace('<FieldLabel optional>Nearby Landmarks</FieldLabel>', '<FieldLabel required>Infrastructure / Nearby Points</FieldLabel>')
s=s.replace('''                <FieldLabel optional>Connectivity</FieldLabel>''','''                <FieldLabel required>Connectivity</FieldLabel>''')
s=s.replace('''                <FieldLabel optional>Price Trends</FieldLabel>''','''                <FieldLabel required>Price Trends</FieldLabel>''')
# Add errors after repeatables: targeted after each add section.
s=s.replace('''                />\n              </div>\n            </SectionCard>\n\n            {/* 4. Price Trends */}''','''                />\n                <FieldError message={errors.infrastructure} />\n              </div>\n            </SectionCard>\n\n            {/* 4. Price Trends */}''',1)
s=s.replace('''                  addLabel="Add Connectivity"\n                />\n                <p''','''                  addLabel="Add Connectivity"\n                />\n                <FieldError message={errors.connectivity} />\n                <p''',1)
s=s.replace('''                  addLabel="Add Price Trend"\n                />\n              </div>''','''                  addLabel="Add Price Trend"\n                />\n                <FieldError message={errors.priceTrends} />\n              </div>''',1)
# Add why buy and about before images
needle='''            {/* 5. Images */}'''
insert='''            {/* 6. Why Buy */}\n            <SectionCard id="section-why-buy" number={6} title="Why Buy" description="Add the reasons a buyer should consider this locality.">\n              <FieldLabel required>Why Buy Points</FieldLabel>\n              <RepeatableRows rows={form.whyBuy} onChange={(v) => set("whyBuy", v)} fields={[{ key: "label", placeholder: "e.g. Strong rental demand" }, { key: "info", placeholder: "e.g. Close to IT employment hubs" }]} emptyRow={{ label: "", info: "" }} addLabel="Add Reason" />\n              <FieldError message={errors.whyBuy} />\n            </SectionCard>\n\n            {/* 7. About */}\n            <SectionCard id="section-about" number={7} title="About This Locality" description="Content used by the locality detail page.">\n              <div><FieldLabel required>About Title</FieldLabel><TextInput value={form.aboutTitle} onChange={(v) => set("aboutTitle", v)} placeholder="e.g. About Electronic City" error={errors.aboutTitle} /><FieldError message={errors.aboutTitle} /></div>\n              <div><FieldLabel required>About Description</FieldLabel><TextArea value={form.aboutDescription} onChange={(v) => set("aboutDescription", v)} placeholder="Write the detailed locality overview shown in the About section." rows={6} error={errors.aboutDescription} /><FieldError message={errors.aboutDescription} /></div>\n            </SectionCard>\n\n            {/* 8. Images */}'''
s=s.replace(needle,insert)
# Update image section number and required labels
s=s.replace('''              number={5}\n              title="Images"''','''              number={8}\n              title="Images"''')
s=s.replace('''                label="Hero Image"''','''                label="Hero Image *"''')
s=s.replace('''                label="Gallery / Main Image"''','''                label="Gallery / Main Image *"''')
s=s.replace('''                label="About Image"''','''                label="About Image *"''')
# Add image errors after each field by matching callbacks block
s=s.replace('''                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, hero: file }))}\n              />''','''                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, hero: file }))}\n              />\n              <FieldError message={errors.heroImageUrl} />''',1)
s=s.replace('''                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, main: file }))}\n              />''','''                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, main: file }))}\n              />\n              <FieldError message={errors.mainImageUrl} />''',1)
s=s.replace('''                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, about: file }))}\n              />''','''                onFileChange={(file) => setImageFiles((prev) => ({ ...prev, about: file }))}\n              />\n              <FieldError message={errors.aboutImageUrl} />''',1)
s=s.replace('''              number={6}\n              title="Publishing"''','''              number={9}\n              title="Publishing"''')
(root/p).write_text(s)

# ---------------- Project: required publish checklist by property type ----------------
p='src/app/dashboard/projects/new/components/validation.ts'
s=(root/p).read_text()
# rewrite entirely for clarity
write(p, '''import type { ProjectFormState } from "./form-types";
export type FormErrors = Partial<Record<keyof ProjectFormState, string>>;
function isValidNumber(value: string): boolean { return !value || !Number.isNaN(Number(value)); }
function completeRows<T extends Record<string, string>>(rows: T[]): T[] { return rows.filter((row) => Object.values(row).every((value) => value.trim())); }

export function validateForm(form: ProjectFormState, forPublish = false, imageCount = 0): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Project name is required.";
  if (!form.slug.trim()) errors.slug = "Slug is required.";
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) errors.slug = "Slug can only contain lowercase letters, numbers and hyphens.";
  if (!form.builderId) errors.builderId = "Select a builder.";
  if (!form.localityId) errors.localityId = "Select a locality.";
  if (!form.propertyType) errors.propertyType = "Select a property type.";
  if (!form.status) errors.status = "Select a project status.";

  if (form.priceMin && !isValidNumber(form.priceMin)) errors.priceMin = "Enter a valid number.";
  if (form.priceType === "Price Range") {
    if (!form.priceMax) errors.priceMax = "Maximum price is required for a price range.";
    else if (!isValidNumber(form.priceMax)) errors.priceMax = "Enter a valid number.";
  } else if (form.priceMax && !isValidNumber(form.priceMax)) errors.priceMax = "Enter a valid number.";

  for (const field of ["totalUnits", "totalPlots", "availableUnits", "latitude", "longitude", "sortOrder"] as const) {
    const value = form[field];
    if (value && !isValidNumber(value)) errors[field] = "Enter a valid number.";
  }

  if (forPublish) {
    if (!form.priceMin.trim()) errors.priceMin = "Starting price is required to publish.";
    if (!form.priceDisplay.trim()) errors.priceDisplay = "Price display is required to publish.";
    if (!form.projectSize.trim()) errors.projectSize = "Project size is required to publish.";
    if (!form.possessionDate.trim()) errors.possessionDate = "Possession / availability date is required to publish.";
    if (!form.availability.trim()) errors.availability = "Availability is required to publish.";
    if (!form.highlights.length) errors.highlights = "Add at least one highlight to publish.";
    if (!form.amenities.length) errors.amenities = "Add at least one amenity to publish.";
    if (!form.address.trim()) errors.address = "Project address is required to publish.";
    if (!form.city.trim()) errors.city = "City is required to publish.";
    if (imageCount === 0) errors.images = "Add at least one project image to publish.";
    if (completeRows(form.nearbyLandmarks).length === 0) errors.nearbyLandmarks = "Add at least one nearby landmark with distance.";
    if (completeRows(form.connectivity).length === 0) errors.connectivity = "Add at least one connectivity point with information.";

    if (form.propertyType === "Apartment") {
      if (!form.bhkOptions.length) errors.bhkOptions = "Add at least one BHK option to publish.";
      if (!form.configuration.trim()) errors.configuration = "Configuration is required to publish apartments.";
      if (!form.areaRange.trim()) errors.areaRange = "Area range is required to publish apartments.";
      if (!form.totalUnits.trim()) errors.totalUnits = "Total units are required to publish apartments.";
      if (!form.availableUnits.trim()) errors.availableUnits = "Available units are required to publish apartments.";
    }

    if (form.propertyType === "Plot") {
      if (!form.plotSizes.length) errors.plotSizes = "Add at least one plot size to publish.";
      if (!form.area.trim()) errors.area = "Plot area is required to publish.";
      if (!form.totalPlots.trim()) errors.totalPlots = "Total plots are required to publish.";
    }
  }
  return errors;
}
export function hasErrors(errors: FormErrors): boolean { return Object.keys(errors).length > 0; }
''')
# Add errors type supports images custom key impossible because keyof excludes. TS error. We'll instead cast type to allow custom keys? Better add images to form type? We'll do.
# add images key to ProjectFormState
p='src/app/dashboard/projects/new/components/form-types.ts'; s=(root/p).read_text(); s=s.replace('''  // Section 6 — Documents (Brochure). Images are placeholder-only, see AGENTS note.\n  brochureTitle''','''  // Publish-only validation helper for project images. Images themselves are stored separately.\n  images?: string;\n\n  // Section 6 — Documents (Brochure). Images are placeholder-only, see AGENTS note.\n  brochureTitle'''); (root/p).write_text(s)
# But initial state optional no need.
# Project form call validation with image count and labels required/error.
p='src/app/dashboard/projects/new/components/AddProjectForm.tsx'; s=(root/p).read_text()
s=s.replace('''    const validationErrors = validateForm(form);''','''    const validationErrors = validateForm(form, mode === "publish", images.length);''')
# Change essential labels
for old,new in [
('<FieldLabel>Price Type</FieldLabel>','<FieldLabel required>Price Type</FieldLabel>'),
('<FieldLabel required>Starting Price</FieldLabel>','<FieldLabel required>Starting Price</FieldLabel>'),
('<FieldLabel optional>Custom Price Display Text</FieldLabel>','<FieldLabel required>Custom Price Display Text</FieldLabel>'),
('<FieldLabel optional>Project Size</FieldLabel>','<FieldLabel required>Project Size</FieldLabel>'),
('<FieldLabel optional>Possession Date</FieldLabel>','<FieldLabel required>Possession / Availability Date</FieldLabel>'),
('<FieldLabel optional>Availability</FieldLabel>','<FieldLabel required>Availability</FieldLabel>'),
('<FieldLabel optional>Highlights</FieldLabel>','<FieldLabel required>Highlights</FieldLabel>'),
('<FieldLabel optional>Amenities</FieldLabel>','<FieldLabel required>Amenities</FieldLabel>'),
('<FieldLabel optional>Address</FieldLabel>','<FieldLabel required>Address</FieldLabel>'),
('<FieldLabel>City</FieldLabel>','<FieldLabel required>City</FieldLabel>'),
('<FieldLabel optional>Nearby Landmarks</FieldLabel>','<FieldLabel required>Nearby Landmarks</FieldLabel>'),
('<FieldLabel optional>Connectivity</FieldLabel>','<FieldLabel required>Connectivity</FieldLabel>'),
]: s=s.replace(old,new)
# Add errors for priceDisplay, projectSize, possession, availability, arrays and address/city, rows, images.
s=s.replace('''                    <TextInput\n                      value={form.priceDisplay}\n                      onChange={(v) => set("priceDisplay", v)}\n                      placeholder="e.g. ₹85L – ₹1.2Cr"\n                    />''','''                    <TextInput value={form.priceDisplay} onChange={(v) => set("priceDisplay", v)} placeholder="e.g. ₹85L – ₹1.2Cr" error={errors.priceDisplay} />\n                    <FieldError message={errors.priceDisplay} />''')
s=s.replace('''                    <TextInput\n                      value={form.projectSize}\n                      onChange={(v) => set("projectSize", v)}\n                      placeholder="e.g. 12.5 Acres"\n                    />''','''                    <TextInput value={form.projectSize} onChange={(v) => set("projectSize", v)} placeholder="e.g. 12.5 Acres" error={errors.projectSize} />\n                    <FieldError message={errors.projectSize} />''')
s=s.replace('''                  <TextInput\n                    type="date"\n                    value={form.possessionDate}\n                    onChange={(v) => set("possessionDate", v)}\n                  />''','''                  <TextInput type="date" value={form.possessionDate} onChange={(v) => set("possessionDate", v)} error={errors.possessionDate} />\n                  <FieldError message={errors.possessionDate} />''')
s=s.replace('''                  <TextInput\n                    value={form.availability}\n                    onChange={(v) => set("availability", v)}\n                    placeholder="e.g. Available"\n                  />''','''                  <TextInput value={form.availability} onChange={(v) => set("availability", v)} placeholder="e.g. Available" error={errors.availability} />\n                  <FieldError message={errors.availability} />''')
# Arrays: insert errors after TagListInput / RepeatableRows
s=s.replace('''                <TagListInput\n                  values={form.highlights}\n                  onChange={(v) => set("highlights", v)}\n                  placeholder="e.g. Prime Location"\n                />''','''                <TagListInput values={form.highlights} onChange={(v) => set("highlights", v)} placeholder="e.g. Prime Location" />\n                <FieldError message={errors.highlights} />''')
s=s.replace('''                <TagListInput\n                  values={form.amenities}\n                  onChange={(v) => set("amenities", v)}\n                  placeholder="e.g. Swimming Pool"\n                />''','''                <TagListInput values={form.amenities} onChange={(v) => set("amenities", v)} placeholder="e.g. Swimming Pool" />\n                <FieldError message={errors.amenities} />''')
# Type-specific labels
s=s.replace('<FieldLabel optional>BHK Options</FieldLabel>','<FieldLabel required>BHK Options</FieldLabel>')
s=s.replace('<FieldLabel optional>Configuration</FieldLabel>','<FieldLabel required>Configuration</FieldLabel>')
s=s.replace('<FieldLabel optional>Area Range</FieldLabel>','<FieldLabel required>Area Range</FieldLabel>')
s=s.replace('<FieldLabel optional>Plot Sizes</FieldLabel>','<FieldLabel required>Plot Sizes</FieldLabel>')
s=s.replace('<FieldLabel optional>Area</FieldLabel>','<FieldLabel required>Area</FieldLabel>')
s=s.replace('<FieldLabel optional>Total Units</FieldLabel>','<FieldLabel required>Total Units</FieldLabel>')
s=s.replace('<FieldLabel optional>Available Units</FieldLabel>','<FieldLabel required>Available Units</FieldLabel>')
s=s.replace('<FieldLabel optional>Total Plots</FieldLabel>','<FieldLabel required>Total Plots</FieldLabel>')
# Error messages under key type fields
s=s.replace('''                  <FieldError message={errors.totalUnits} />''','''                  <FieldError message={errors.totalUnits} />''')
# Plot sizes TagListInput likely has no error; add after it by generic placeholder snippet
s=s.replace('''                      placeholder="e.g. 30 × 40"\n                    />''','''                      placeholder="e.g. 30 × 40"\n                    />\n                    <FieldError message={errors.plotSizes} />''')
# address/city
s=s.replace('''                  rows={2}\n                />''','''                  rows={2}\n                  error={errors.address}\n                />\n                <FieldError message={errors.address} />''',1)
s=s.replace('''                  value={form.city}\n                  onChange={(v) => set("city", v)}\n                />''','''                  value={form.city}\n                  onChange={(v) => set("city", v)}\n                  error={errors.city}\n                />\n                <FieldError message={errors.city} />''')
# Repeatable errors
s=s.replace('''                  addLabel="Add Landmark"\n                />\n                <p''','''                  addLabel="Add Landmark"\n                />\n                <FieldError message={errors.nearbyLandmarks} />\n                <p''',1)
s=s.replace('''                  addLabel="Add Connectivity"\n                />\n                <p''','''                  addLabel="Add Connectivity"\n                />\n                <FieldError message={errors.connectivity} />\n                <p''',1)
# Image required label + error
s=s.replace('<FieldLabel optional>Project Images</FieldLabel>','<FieldLabel required>Project Images</FieldLabel>')
s=s.replace('''                />\n              </div>\n\n              <div className="border-t border-line pt-5">''','''                />\n                <FieldError message={errors.images} />\n              </div>\n\n              <div className="border-t border-line pt-5">''',1)
(root/p).write_text(s)

# Project sectionId helper add new error keys
p='src/app/dashboard/projects/new/components/AddProjectForm.tsx'; s=(root/p).read_text(); s=s.replace('''    "status",\n  ];''','''    "status",\n    "priceDisplay",\n    "projectSize",\n    "possessionDate",\n    "availability",\n    "highlights",\n    "amenities",\n    "bhkOptions",\n    "configuration",\n    "areaRange",\n    "plotSizes",\n    "area",\n    "images",\n    "address",\n    "city",\n    "nearbyLandmarks",\n    "connectivity",\n  ];''',1); (root/p).write_text(s)

# ---------------- Leads: richer table, detail editing, CSV export ----------------
write('src/lib/leads-data.ts', '''import type { SupabaseClient } from "@supabase/supabase-js";
/* eslint-disable @typescript-eslint/no-explicit-any */

export const LEADS_PAGE_SIZE = 10;
export const LEAD_STATUSES = ["New", "Contacted", "Follow-up", "Closed"] as const;

export interface LeadListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  preferredContact: string | null;
  message: string | null;
  projectId: string | null;
  projectName: string | null;
  builderId: string | null;
  builderName: string | null;
  localityId: string | null;
  localityName: string | null;
  propertyType: string | null;
  bhk: string | null;
  budget: string | null;
  source: string;
  status: string;
  notes: string | null;
  nextFollowUpDate: string | null;
  nextFollowUpTime: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
export interface LeadSummaryCounts { all: number; newLeads: number; followUps: number; closed: number; }
export interface LeadsQuery { search?: string; status?: string; page: number; }
export interface LeadsResult { items: LeadListItem[]; totalCount: number; error: string | null; }

async function safeCount(supabase: SupabaseClient, build?: (query: any) => any): Promise<number> {
  try {
    let query: any = supabase.from("leads").select("*", { count: "exact", head: true });
    if (build) query = build(query);
    const { count, error } = await query;
    if (error) { console.error("[leads-data] count failed:", error.message); return 0; }
    return count ?? 0;
  } catch (error) { console.error("[leads-data] count threw:", error); return 0; }
}

export async function getLeadSummaryCounts(supabase: SupabaseClient): Promise<LeadSummaryCounts> {
  const [all, newLeads, followUps, closed] = await Promise.all([
    safeCount(supabase),
    safeCount(supabase, q => q.eq("status", "New")),
    safeCount(supabase, q => q.eq("status", "Follow-up")),
    safeCount(supabase, q => q.eq("status", "Closed")),
  ]);
  return { all, newLeads, followUps, closed };
}

export async function getLeads(supabase: SupabaseClient, query: LeadsQuery): Promise<LeadsResult> {
  try {
    const from = (query.page - 1) * LEADS_PAGE_SIZE;
    const to = from + LEADS_PAGE_SIZE - 1;
    let builder: any = supabase.from("leads").select(`id,name,phone,email,whatsapp,preferred_contact,message,project_id,builder_id,locality_id,property_type,bhk,budget,source,status,notes,next_follow_up_date,next_follow_up_time,created_at,updated_at`, { count: "exact" });

    if (query.search) {
      const term = query.search.trim().replace(/[%_,]/g, "\\$&");
      builder = builder.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
    }
    if (query.status && LEAD_STATUSES.includes(query.status as (typeof LEAD_STATUSES)[number])) builder = builder.eq("status", query.status);
    builder = builder.order("created_at", { ascending: false }).range(from, to);

    const { data: leads, error, count } = await builder;
    if (error) return { items: [], totalCount: 0, error: error.message };

    const rows = (leads ?? []) as any[];
    const projectIds = Array.from(new Set(rows.map(r => r.project_id).filter(Boolean)));
    const builderIds = Array.from(new Set(rows.map(r => r.builder_id).filter(Boolean)));
    const localityIds = Array.from(new Set(rows.map(r => r.locality_id).filter(Boolean)));

    const [projects, builders, localities] = await Promise.all([
      projectIds.length ? supabase.from("projects").select("id,name").in("id", projectIds) : Promise.resolve({ data: [], error: null }),
      builderIds.length ? supabase.from("builders").select("id,name").in("id", builderIds) : Promise.resolve({ data: [], error: null }),
      localityIds.length ? supabase.from("localities").select("id,name").in("id", localityIds) : Promise.resolve({ data: [], error: null }),
    ]);
    const map = <T extends { id: string; name: string }>(rows: T[] | null) => new Map((rows ?? []).map(r => [r.id, r.name]));
    const projectMap = map(projects.data as any[]);
    const builderMap = map(builders.data as any[]);
    const localityMap = map(localities.data as any[]);

    const items: LeadListItem[] = rows.map(row => ({
      id: row.id, name: row.name ?? "", phone: row.phone ?? "", email: row.email ?? null,
      whatsapp: row.whatsapp ?? null, preferredContact: row.preferred_contact ?? null, message: row.message ?? null,
      projectId: row.project_id ?? null, projectName: row.project_id ? projectMap.get(row.project_id) ?? null : null,
      builderId: row.builder_id ?? null, builderName: row.builder_id ? builderMap.get(row.builder_id) ?? null : null,
      localityId: row.locality_id ?? null, localityName: row.locality_id ? localityMap.get(row.locality_id) ?? null : null,
      propertyType: row.property_type ?? null, bhk: row.bhk ?? null, budget: row.budget ?? null,
      source: row.source ?? "Website", status: row.status ?? "New", notes: row.notes ?? null,
      nextFollowUpDate: row.next_follow_up_date ?? null, nextFollowUpTime: row.next_follow_up_time ?? null,
      createdAt: row.created_at ?? null, updatedAt: row.updated_at ?? null,
    }));
    return { items, totalCount: count ?? items.length, error: null };
  } catch (error) {
    console.error("[leads-data] getLeads threw:", error);
    return { items: [], totalCount: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
''')

# Summary cards names
p='src/app/dashboard/leads/components/LeadsSummaryCards.tsx'; s=(root/p).read_text(); s=s.replace('import { CheckCircle2, ClipboardList, Clock3, MapPin } from "lucide-react";', 'import { CheckCircle2, ClipboardList, Clock3, PhoneCall } from "lucide-react";').replace('counts.siteVisits', 'counts.followUps').replace('icon={MapPin} label="Site Visits"', 'icon={PhoneCall} label="Follow-up"').replace('supportingText="Site visits requested"','supportingText="Leads needing follow-up"'); (root/p).write_text(s)

# Filter toolbar status list automatically uses new statuses.

# Export button
write('src/app/dashboard/leads/components/LeadExportButton.tsx', '''"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function LeadExportButton() {
  const [busy, setBusy] = useState(false);
  async function exportCsv() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("leads").select("name,phone,email,whatsapp,preferred_contact,message,project_id,builder_id,locality_id,property_type,bhk,budget,source,status,notes,next_follow_up_date,next_follow_up_time,created_at").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const ids = {
        project: Array.from(new Set(rows.map(r => r.project_id).filter(Boolean))),
        builder: Array.from(new Set(rows.map(r => r.builder_id).filter(Boolean))),
        locality: Array.from(new Set(rows.map(r => r.locality_id).filter(Boolean))),
      };
      const [projects, builders, localities] = await Promise.all([
        ids.project.length ? supabase.from("projects").select("id,name").in("id", ids.project) : Promise.resolve({ data: [] }),
        ids.builder.length ? supabase.from("builders").select("id,name").in("id", ids.builder) : Promise.resolve({ data: [] }),
        ids.locality.length ? supabase.from("localities").select("id,name").in("id", ids.locality) : Promise.resolve({ data: [] }),
      ]);
      const lookup = (items: any[]) => new Map((items ?? []).map(item => [item.id, item.name]));
      const pm = lookup(projects.data as any[]), bm = lookup(builders.data as any[]), lm = lookup(localities.data as any[]);
      const headers = ["Name","Phone","Email","WhatsApp","Preferred Contact","Project","Builder","Locality","Property Type","BHK","Budget","Message","Source","Status","Notes","Next Follow-up Date","Next Follow-up Time","Created At"];
      const lines = [headers.map(csvCell).join(","), ...rows.map(r => [r.name,r.phone,r.email,r.whatsapp,r.preferred_contact,r.project_id ? pm.get(r.project_id) : "",r.builder_id ? bm.get(r.builder_id) : "",r.locality_id ? lm.get(r.locality_id) : "",r.property_type,r.bhk,r.budget,r.message,r.source,r.status,r.notes,r.next_follow_up_date,r.next_follow_up_time,r.created_at].map(csvCell).join(","))];
      const blob = new Blob(["\\ufeff" + lines.join("\\r\\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `shrika-dreams-leads-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not export leads.");
    } finally { setBusy(false); }
  }
  return <button type="button" onClick={exportCsv} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold px-3.5 py-2.5 text-sm font-semibold text-gold hover:bg-gold-light/20 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV</button>;
}
''')

# Replace LeadsTable with richer client table/detail editor
write('src/app/dashboard/leads/components/LeadsTable.tsx', '''"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Inbox, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { LeadListItem } from "@/lib/leads-data";
import { LEAD_STATUSES } from "@/lib/leads-data";
import { useRouter } from "next/navigation";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LeadsTable({ items, hasActiveFilters, error }: { items: LeadListItem[]; hasActiveFilters: boolean; error: string | null }) {
  if (error) return <div className="p-8 text-center text-sm text-red-600">Unable to load leads: {error}</div>;
  if (items.length === 0) return <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-6 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface"><Inbox className="h-5 w-5 text-muted" /></div><div><p className="text-sm font-semibold text-ink">{hasActiveFilters ? "No leads match your filters" : "No leads yet"}</p><p className="mt-1 text-xs text-muted">Website enquiries will appear here when they are received.</p></div></div>;
  return <><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1100px] text-left"><thead className="bg-surface text-[10px] font-bold uppercase tracking-[0.08em] text-muted"><tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Received</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-line text-sm">{items.map(item => <LeadRow key={item.id} item={item} />)}</tbody></table></div><div className="divide-y divide-line lg:hidden">{items.map(item => <LeadCard key={item.id} item={item} />)}</div></>;
}

function StatusSelect({ item }: { item: LeadListItem }) {
  const router = useRouter(); const [saving, setSaving] = useState(false);
  async function updateStatus(value: string) { if (!value || value === item.status || saving) return; setSaving(true); const supabase = createClient(); const { error } = await supabase.from("leads").update({ status: value }).eq("id", item.id); setSaving(false); if (error) window.alert(error.message); else router.refresh(); }
  return <select value={item.status} disabled={saving} onChange={e => updateStatus(e.target.value)} className="rounded-full border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink outline-none disabled:opacity-60">{LEAD_STATUSES.map(status => <option key={status}>{status}</option>)}</select>;
}

function LeadRow({ item }: { item: LeadListItem }) { const [open,setOpen]=useState(false); return <tr className="hover:bg-surface/60"><td className="px-4 py-4"><p className="font-semibold text-ink">{item.name || "Unnamed lead"}</p><p className="mt-0.5 text-xs text-muted">{item.email || "No email"}</p></td><td className="px-4 py-4 text-muted whitespace-nowrap">{item.phone || "—"}</td><td className="px-4 py-4 text-muted">{item.projectName ?? "—"}</td><td className="px-4 py-4 text-muted">{item.budget ?? "—"}</td><td className="px-4 py-4"><StatusSelect item={item} /></td><td className="px-4 py-4 text-muted whitespace-nowrap">{formatDate(item.createdAt)}</td><td className="px-4 py-4 text-right"><button type="button" onClick={()=>setOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface"><Eye className="h-3.5 w-3.5"/> View</button></td>{open && <LeadDetails item={item} onClose={()=>setOpen(false)} />}</tr>; }
function LeadCard({ item }: { item: LeadListItem }) { const [open,setOpen]=useState(false); return <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{item.name || "Unnamed lead"}</p><p className="mt-1 text-xs text-muted">{item.projectName ?? "No project selected"}</p><p className="mt-1 text-xs text-muted">{item.phone}</p></div><StatusSelect item={item}/></div><div className="flex items-center justify-between text-xs text-muted"><span>{formatDate(item.createdAt)}</span><button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center gap-1.5 font-semibold text-gold"><Eye className="h-3.5 w-3.5"/> View</button></div>{open && <LeadDetails item={item} onClose={()=>setOpen(false)}/>}</div>; }

function LeadDetails({ item, onClose }: { item: LeadListItem; onClose: () => void }) {
  const router = useRouter();
  const [status,setStatus]=useState(item.status);
  const [notes,setNotes]=useState(item.notes ?? "");
  const [date,setDate]=useState(item.nextFollowUpDate ?? "");
  const [time,setTime]=useState(item.nextFollowUpTime?.slice(0,5) ?? "");
  const [saving,setSaving]=useState(false);
  async function save() { if (saving) return; setSaving(true); const supabase=createClient(); const {error}=await supabase.from("leads").update({status,notes:notes.trim() || null,next_follow_up_date:date || null,next_follow_up_time:time || null}).eq("id",item.id); setSaving(false); if(error){window.alert(error.message);return;} onClose(); router.refresh(); }
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onMouseDown={onClose}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-white p-5 text-left shadow-xl sm:p-6" onMouseDown={e=>e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-gold">Lead Details</p><h3 className="mt-1 text-xl font-bold text-ink">{item.name || "Unnamed lead"}</h3></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"><X className="h-5 w-5"/></button></div>
  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"><Detail label="Phone" value={item.phone || "—"}/><Detail label="Email" value={item.email || "—"}/><Detail label="WhatsApp" value={item.whatsapp || "—"}/><Detail label="Preferred Contact" value={item.preferredContact || "—"}/><Detail label="Project" value={item.projectName || "—"}/><Detail label="Builder" value={item.builderName || "—"}/><Detail label="Locality" value={item.localityName || "—"}/><Detail label="Property Type" value={item.propertyType || "—"}/><Detail label="BHK / Configuration" value={item.bhk || "—"}/><Detail label="Budget" value={item.budget || "—"}/><Detail label="Source" value={item.source || "—"}/><Detail label="Received" value={formatDate(item.createdAt)}/><Detail label="Message" value={item.message || "—"} full/></div>
  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3"><div><label className="mb-1.5 block text-sm font-semibold text-ink">Status</label><select value={status} onChange={e=>setStatus(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none">{LEAD_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div><div><label className="mb-1.5 block text-sm font-semibold text-ink">Next Follow-up Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none"/></div><div><label className="mb-1.5 block text-sm font-semibold text-ink">Next Follow-up Time</label><input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none"/></div></div>
  <div className="mt-4"><label className="mb-1.5 block text-sm font-semibold text-ink">Notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} placeholder="Add internal notes about this lead…" className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none"/></div>
  <div className="mt-5 flex justify-end gap-2.5"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface">Cancel</button><button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin"/>}Save Lead</button></div>
  </div></div>, document.body);
}
function Detail({ label,value,full=false }: { label:string; value:string; full?:boolean }) { return <div className={`${full ? "sm:col-span-2" : ""} rounded-xl border border-line bg-surface p-3`}><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-ink">{value}</p></div>; }
''')

# Leads page header export button
p='src/app/dashboard/leads/page.tsx'; s=(root/p).read_text(); s=s.replace('import LeadPaginationControls from "./components/LeadPaginationControls";', 'import LeadPaginationControls from "./components/LeadPaginationControls";\nimport LeadExportButton from "./components/LeadExportButton";')
s=s.replace('''        adminName={ADMIN_DISPLAY_NAME}\n      />''','''        adminName={ADMIN_DISPLAY_NAME}\n        action={<LeadExportButton />}\n      />''')
(root/p).write_text(s)

# Update schema comments so future edits don't regress
p='src/lib/builders-data.ts'; s=(root/p).read_text(); s=s.replace('''builders: id (uuid), name, slug, logo_url, image_url, short_description,\n *           about, website_url, founded_year (int), headquarters, seo_title,''','''builders: id (uuid), name, slug, tagline, logo_url, image_url, short_description,\n *           about, website_url, founded_year (int), headquarters, years_experience, projects_count, seo_title,'''); (root/p).write_text(s)

# Clean local comments that are now stale
p='src/app/dashboard/localities/new/components/form-types.ts'; s=(root/p).read_text(); (root/p).write_text(s)
