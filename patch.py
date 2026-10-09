from pathlib import Path
root=Path('/mnt/data/adminfix')
# form-types
p=root/'src/app/dashboard/localities/new/components/form-types.ts'
s=p.read_text()
s=s.replace('export interface InfrastructureRow { [key: string]: string; label: string; info: string; }\nexport interface PriceTrendRow { [key: string]: string; period: string; price: string; }', '''export interface InfrastructureRow { [key: string]: string; label: string; info: string; infoUnit: string; }
export interface PriceTrendRow { [key: string]: string; period: string; price: string; priceUnit: string; }''')
s=s.replace('  shortDescription: string;\n  fullDescription: string;\n  averagePrice: string;\n  priceRange: string;', '''  shortDescription: string;
  fullDescription: string;
  averagePrice: string;
  averagePriceValue: string;
  averagePriceUnit: string;
  priceRange: string;
  priceRangeMin: string;
  priceRangeMinUnit: string;
  priceRangeMax: string;
  priceRangeMaxUnit: string;''')
s=s.replace('  shortDescription: "",\n  fullDescription: "",\n  averagePrice: "",\n  priceRange: "",', '''  shortDescription: "",
  fullDescription: "",
  averagePrice: "",
  averagePriceValue: "",
  averagePriceUnit: "L",
  priceRange: "",
  priceRangeMin: "",
  priceRangeMinUnit: "L",
  priceRangeMax: "",
  priceRangeMaxUnit: "Cr",''')
p.write_text(s)

# validation locality
p=root/'src/app/dashboard/localities/new/components/validation.ts'
s=p.read_text()
s=s.replace('if (!form.averagePrice.trim()) errors.averagePrice = "Average price is required to publish.";', 'if (!form.averagePriceValue.trim()) errors.averagePrice = "Average price is required to publish.";')
s=s.replace('if (!form.priceRange.trim()) errors.priceRange = "Price range is required to publish.";', 'if (!form.priceRangeMin.trim() || !form.priceRangeMax.trim()) errors.priceRange = "Price range minimum and maximum are required to publish.";')
s=s.replace('form.infrastructure.filter(r => r.label.trim() && r.info.trim()).length', 'form.infrastructure.filter(r => r.label.trim() && r.info.trim() && r.infoUnit.trim()).length')
s=s.replace('form.priceTrends.filter(r => r.period.trim() && r.price.trim()).length', 'form.priceTrends.filter(r => r.period.trim() && r.price.trim() && r.priceUnit.trim()).length')
p.write_text(s)

# create locality normalize unit rows
p=root/'src/app/dashboard/localities/new/components/create-locality.ts'
s=p.read_text()
s=s.replace('function toJsonArrayOrEmpty<T extends Record<string, string>>(\n  rows: readonly T[]\n): T[] {', '''function toJsonArrayOrEmpty<T extends Record<string, string>>(
  rows: readonly T[]
): T[] {''')
insert='''\nfunction formatUnitValue(value: string, unit: string): string {\n  const v = value.trim();\n  const u = unit.trim();\n  if (!v) return "";\n  if (!u) return v;\n  if (u === "/sq.ft.") return `${v} /sq.ft.`;\n  if (u === "km") return `${v} km`;\n  if (u === "mins") return `${v} mins`;\n  if (u === "L") return `${v}L`;\n  if (u === "Cr") return `${v}Cr`;\n  return `${v} ${u}`;\n}\n\nfunction formatPriceRange(form: LocalityFormState): string | null {\n  const min = form.priceRangeMin.trim();\n  const max = form.priceRangeMax.trim();\n  if (!min && !max) return null;\n  const minText = min ? formatUnitValue(min, form.priceRangeMinUnit) : "";\n  const maxText = max ? formatUnitValue(max, form.priceRangeMaxUnit) : "";\n  return [minText, maxText].filter(Boolean).join(" – ") || null;\n}\n'''
s=s.replace('''/**
 * Every key here''', insert+'''\n/**
 * Every key here''')
s=s.replace('''    average_price: toStringOrNull(form.averagePrice),
    price_range: toStringOrNull(form.priceRange),''', '''    average_price: form.averagePriceValue.trim()
      ? formatUnitValue(form.averagePriceValue, form.averagePriceUnit)
      : toStringOrNull(form.averagePrice),
    price_range: formatPriceRange(form) ?? toStringOrNull(form.priceRange),''')
s=s.replace('''    infrastructure: toJsonArrayOrEmpty(form.infrastructure),
    price_trends: toJsonArrayOrEmpty(form.priceTrends),''', '''    infrastructure: toJsonArrayOrEmpty(
      form.infrastructure.map(({ label, info, infoUnit }) => ({
        label: label.trim(),
        info: formatUnitValue(info, infoUnit),
      }))
    ),
    price_trends: toJsonArrayOrEmpty(
      form.priceTrends.map(({ period, price, priceUnit }) => ({
        period: period.trim(),
        price: formatUnitValue(price, priceUnit),
      }))
    ),''')
p.write_text(s)

# locality mapper with parsers
p=root/'src/app/dashboard/localities/[id]/edit/locality-to-form.ts'
s=p.read_text()
helper='''\nfunction parseUnitValue(value: string | null | undefined, fallbackUnit: string): { value: string; unit: string } {\n  const raw = (value ?? "").trim();\n  const match = raw.match(/₹?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*(\\/sq\\.ft\\.?|km|mins|Cr|L|Lakhs?)/i);\n  if (!match) return { value: raw.replace(/^₹\\s*/, ""), unit: fallbackUnit };\n  let unit = match[2];\n  if (/^lakhs?$/i.test(unit)) unit = "L";\n  else if (/^cr$/i.test(unit)) unit = "Cr";\n  else if (/^km$/i.test(unit)) unit = "km";\n  else if (/^mins$/i.test(unit)) unit = "mins";\n  else unit = "/sq.ft.";\n  return { value: match[1], unit };\n}\n\nfunction parsePriceRange(value: string | null | undefined) {\n  const raw = (value ?? "").trim();\n  const parts = raw.split(/\\s*[–-]\\s*/);\n  const min = parseUnitValue(parts[0] ?? "", "L");\n  const max = parseUnitValue(parts[1] ?? "", "Cr");\n  return { raw, min: min.value, minUnit: min.unit, max: max.value, maxUnit: max.unit };\n}\n'''
s=s.replace('type JsonRow = Record<string, unknown>;', 'type JsonRow = Record<string, unknown>;'+helper)
# toRows should add unit based on key and parse info/price
s=s.replace('''    const out: Record<string, string> = {};
    for (const key of keys) {
      const v = row[key];
      out[key] = v === null || v === undefined ? "" : String(v);
    }
    return out as T;''', '''    const out: Record<string, string> = {};
    for (const key of keys) {
      const v = row[key];
      out[key] = v === null || v === undefined ? "" : String(v);
    }
    if ("info" in out) {
      const parsed = parseUnitValue(out.info, "km");
      out.info = parsed.value;
      out.infoUnit = parsed.unit;
    }
    if ("price" in out) {
      const parsed = parseUnitValue(out.price, "/sq.ft.");
      out.price = parsed.value;
      out.priceUnit = parsed.unit;
    }
    return out as T;''')
s=s.replace('''    averagePrice: row.average_price ?? "",
    priceRange: row.price_range ?? "",''', '''    averagePrice: row.average_price ?? "",
    averagePriceValue: parseUnitValue(row.average_price, "/sq.ft.").value,
    averagePriceUnit: parseUnitValue(row.average_price, "/sq.ft.").unit,
    priceRange: row.price_range ?? "",
    priceRangeMin: parsePriceRange(row.price_range).min,
    priceRangeMinUnit: parsePriceRange(row.price_range).minUnit,
    priceRangeMax: parsePriceRange(row.price_range).max,
    priceRangeMaxUnit: parsePriceRange(row.price_range).maxUnit,''')
p.write_text(s)
from pathlib import Path
root=Path('/mnt/data/adminfix')
# Extend RepeatableRows with select fields
p=root/'src/app/dashboard/components/form/FormFields.tsx'
s=p.read_text()
s=s.replace('''  fields: { key: keyof T; placeholder: string }[];''','''  fields: {
    key: keyof T;
    placeholder: string;
    type?: "text" | "select";
    options?: { value: string; label: string }[];
  }[];''')
old='''          {fields.map((f) => (
            <input
              key={String(f.key)}
              type="text"
              value={row[f.key]}
              onChange={(e) => updateRow(idx, f.key, e.target.value)}
              placeholder={f.placeholder}
              className={`${inputBase} ${inputBorder(false)} flex-1 min-w-[140px]`}
            />
          ))}'''
new='''          {fields.map((f) =>
            f.type === "select" ? (
              <select
                key={String(f.key)}
                value={row[f.key]}
                onChange={(e) => updateRow(idx, f.key, e.target.value)}
                className={`${inputBase} ${inputBorder(false)} flex-1 min-w-[140px] bg-white`}
                aria-label={String(f.key)}
              >
                {(f.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input
                key={String(f.key)}
                type="text"
                value={row[f.key]}
                onChange={(e) => updateRow(idx, f.key, e.target.value)}
                placeholder={f.placeholder}
                className={`${inputBase} ${inputBorder(false)} flex-1 min-w-[140px]`}
              />
            )
          )}'''
if old not in s: raise SystemExit('RepeatableRows block not found')
s=s.replace(old,new)
p.write_text(s)

# AddLocalityForm patches
p=root/'src/app/dashboard/localities/new/components/AddLocalityForm.tsx'
s=p.read_text()
s=s.replace('''  const [imageFiles, setImageFiles] = useState<Record<"hero" | "main" | "about", File | null>>({ hero: null, main: null, about: null });''','''  const [imageFiles, setImageFiles] = useState<Record<"hero" | "main" | "about", File | null>>({ hero: null, main: null, about: null });''')
# helper functions before component
marker='''interface AddLocalityFormProps {
  initialForm?: LocalityFormState;
  localityId?: string;
}'''
helper='''interface AddLocalityFormProps {
  initialForm?: LocalityFormState;
  localityId?: string;
}

const PRICE_UNITS = [
  { value: "L", label: "Lakhs" },
  { value: "Cr", label: "Cr" },
  { value: "/sq.ft.", label: "/sq.ft." },
];

const DISTANCE_UNITS = [
  { value: "km", label: "km" },
  { value: "mins", label: "mins" },
];

const WHY_BUY_PRESETS = [
  { label: "Strong rental demand", info: "Good rental potential from nearby employment hubs" },
  { label: "IT employment hubs", info: "Close to major IT and employment corridors" },
  { label: "Metro connectivity", info: "Improving access through metro connectivity" },
  { label: "Social infrastructure", info: "Schools, hospitals and daily conveniences nearby" },
  { label: "Growth potential", info: "Strong infrastructure and development potential" },
  { label: "Established locality", info: "Established residential and commercial ecosystem" },
];'''
s=s.replace(marker,helper)
# validation scroll helper in handleSubmit
s=s.replace('''    if (hasErrors(validationErrors)) {
      document.getElementById("section-basic")?.scrollIntoView({ behavior: "smooth" });
      return;
    }''','''    if (hasErrors(validationErrors)) {
      const sectionByField: Record<string, string> = {
        name: "section-basic", slug: "section-basic", city: "section-basic",
        shortDescription: "section-overview", fullDescription: "section-overview",
        averagePrice: "section-overview", priceRange: "section-overview", popularBhk: "section-overview",
        infrastructure: "section-connectivity", connectivity: "section-connectivity",
        priceTrends: "section-price-trends", whyBuy: "section-why-buy",
        aboutTitle: "section-about", aboutDescription: "section-about",
        heroImageUrl: "section-images", mainImageUrl: "section-images", aboutImageUrl: "section-images",
      };
      const firstKey = Object.keys(validationErrors)[0];
      document.getElementById(sectionByField[firstKey] ?? "section-basic")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }''',1)
# overview replace block
old='''                <FieldLabel required>Short Description</FieldLabel>
                <TextArea
                  value={form.shortDescription}
                  onChange={(v) => set("shortDescription", v)}
                  placeholder="Enter a short description (max 200 characters)"
                  rows={2}
                  maxLength={200}
                  error={errors.shortDescription}
                />
                <FieldError message={errors.shortDescription} />'''
new='''                <FieldLabel required>Tagline</FieldLabel>
                <TextArea
                  value={form.shortDescription}
                  onChange={(v) => set("shortDescription", v)}
                  placeholder="Enter a short locality tagline"
                  rows={2}
                  maxLength={200}
                  error={errors.shortDescription}
                />
                <FieldError message={errors.shortDescription} />'''
s=s.replace(old,new)
old='''                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div><FieldLabel required>Average Price</FieldLabel><TextInput value={form.averagePrice} onChange={(v) => set("averagePrice", v)} placeholder="e.g. ₹6,500/sq.ft" error={errors.averagePrice} /><FieldError message={errors.averagePrice} /></div>
                <div><FieldLabel required>Price Range</FieldLabel><TextInput value={form.priceRange} onChange={(v) => set("priceRange", v)} placeholder="e.g. ₹45L – ₹2.5Cr" error={errors.priceRange} /><FieldError message={errors.priceRange} /></div>'''
new='''                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Average Price</FieldLabel>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <TextInput value={form.averagePriceValue} onChange={(v) => set("averagePriceValue", v.replace(/[^0-9.,]/g, ""))} placeholder="e.g. 6500" error={errors.averagePrice} />
                    <select value={form.averagePriceUnit} onChange={(e) => set("averagePriceUnit", e.target.value)} className="rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-amber-300">
                      {PRICE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                  <FieldError message={errors.averagePrice} />
                </div>
                <div>
                  <FieldLabel required>Price Range</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid grid-cols-[1fr_auto] gap-1">
                      <TextInput value={form.priceRangeMin} onChange={(v) => set("priceRangeMin", v.replace(/[^0-9.,]/g, ""))} placeholder="Min" error={errors.priceRange} />
                      <select value={form.priceRangeMinUnit} onChange={(e) => set("priceRangeMinUnit", e.target.value)} className="rounded-lg border border-line bg-white px-2 text-xs text-ink outline-none"><option value="L">L</option><option value="Cr">Cr</option></select>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-1">
                      <TextInput value={form.priceRangeMax} onChange={(v) => set("priceRangeMax", v.replace(/[^0-9.,]/g, ""))} placeholder="Max" error={errors.priceRange} />
                      <select value={form.priceRangeMaxUnit} onChange={(e) => set("priceRangeMaxUnit", e.target.value)} className="rounded-lg border border-line bg-white px-2 text-xs text-ink outline-none"><option value="L">L</option><option value="Cr">Cr</option></select>
                    </div>
                  </div>
                  <FieldError message={errors.priceRange} />
                </div>'''
if old not in s: raise SystemExit('overview price block not found')
s=s.replace(old,new)
# infrastructure Repeatable fields
s=s.replace('''fields={[
                    { key: "label", placeholder: "e.g. Phoenix Marketcity" },
                    { key: "info", placeholder: "e.g. 2.5 km" },
                  ]}
                  emptyRow={{ label: "", info: "" }}''','''fields={[
                    { key: "label", placeholder: "e.g. Phoenix Marketcity" },
                    { key: "info", placeholder: "e.g. 2.5" },
                    { key: "infoUnit", placeholder: "", type: "select", options: DISTANCE_UNITS },
                  ]}
                  emptyRow={{ label: "", info: "", infoUnit: "km" }}''',1)
# presets add unit
s=s.replace('''onClick={() => set("infrastructure", [...form.infrastructure, { label, info: "" }])}''','''onClick={() => set("infrastructure", [...form.infrastructure, { label, info: "", infoUnit: "km" }])}''')
# price trends
s=s.replace('''fields={[
                    { key: "period", placeholder: "e.g. 2023" },
                    { key: "price", placeholder: "e.g. ₹5,200/sq.ft" },
                  ]}
                  emptyRow={{ period: "", price: "" }}''','''fields={[
                    { key: "period", placeholder: "e.g. 2023" },
                    { key: "price", placeholder: "e.g. 5200" },
                    { key: "priceUnit", placeholder: "", type: "select", options: [{ value: "/sq.ft.", label: "/sq.ft." }, { value: "L", label: "Lakhs" }, { value: "Cr", label: "Cr" }] },
                  ]}
                  emptyRow={{ period: "", price: "", priceUnit: "/sq.ft." }}''')
# Why buy add presets after repeatable
needle='''              <RepeatableRows rows={form.whyBuy} onChange={(v) => set("whyBuy", v)} fields={[{ key: "label", placeholder: "e.g. Strong rental demand" }, { key: "info", placeholder: "e.g. Close to IT employment hubs" }]} emptyRow={{ label: "", info: "" }} addLabel="Add Reason" />
              <FieldError message={errors.whyBuy} />'''
repl='''              <RepeatableRows rows={form.whyBuy} onChange={(v) => set("whyBuy", v)} fields={[{ key: "label", placeholder: "e.g. Strong rental demand" }, { key: "info", placeholder: "e.g. Close to IT employment hubs" }]} emptyRow={{ label: "", info: "" }} addLabel="Add Reason" />
              <div className="mt-3 flex flex-wrap gap-2">
                {WHY_BUY_PRESETS.map((preset) => (
                  <button key={preset.label} type="button" onClick={() => set("whyBuy", [...form.whyBuy, preset])} className="rounded-lg border border-line bg-white px-2.5 py-2 text-xs font-semibold text-muted hover:border-gold/60 hover:bg-surface hover:text-navy">
                    + {preset.label}
                  </button>
                ))}
              </div>
              <FieldError message={errors.whyBuy} />'''
if needle not in s: raise SystemExit('why buy block not found')
s=s.replace(needle,repl)
# numbering
s=s.replace('id="section-why-buy" number={6}', 'id="section-why-buy" number={5}')
s=s.replace('id="section-about" number={7}', 'id="section-about" number={6}')
s=s.replace('id="section-images"\n              number={8}', 'id="section-images"\n              number={7}')
s=s.replace('id="section-publishing"\n              number={9}', 'id="section-publishing"\n              number={8}')
p.write_text(s)

# Builder types remove fields
p=root/'src/app/dashboard/builders/new/components/form-types.ts'
s=p.read_text().replace('  foundedYear: string;\n  headquarters: string;\n','').replace('  foundedYear: "",\n  headquarters: "",\n','')
p.write_text(s)
# builder validation replace
p=root/'src/app/dashboard/builders/new/components/validation.ts'
s=p.read_text()
start=s.index('  if (form.foundedYear')
end=s.index('\n  if (forPublish)', start)
s=s[:start]+s[end:]
s=s.replace('    if (!form.headquarters.trim()) errors.headquarters = "Headquarters is required to publish.";\n    if (!form.foundedYear.trim()) errors.foundedYear = "Founded year is required to publish.";\n','')
s=s.replace('function isValidNumber(value: string): boolean {\n  if (!value) return true;\n  return !Number.isNaN(Number(value));\n}', '''function isValidNumber(value: string): boolean {
  if (!value.trim()) return true;
  return /^\\d+$/.test(value.trim());
}''')
s=s.replace('    if (!form.projectsCount.trim()) errors.projectsCount = "Projects count is required to publish.";', '    if (!form.projectsCount.trim()) errors.projectsCount = "Projects count is required to publish.";\n    if (form.yearsExperience.trim() && !isValidNumber(form.yearsExperience)) errors.yearsExperience = "Enter numbers only.";\n    if (form.projectsCount.trim() && !isValidNumber(form.projectsCount)) errors.projectsCount = "Enter numbers only.";')
p.write_text(s)
# builder create remove fields
p=root/'src/app/dashboard/builders/new/components/create-builder.ts'
s=p.read_text().replace('    founded_year: toIntOrNull(form.foundedYear),\n    headquarters: toStringOrNull(form.headquarters),\n','')
p.write_text(s)
# builder mapper remove fields
p=root/'src/app/dashboard/builders/[id]/edit/builder-to-form.ts'
s=p.read_text().replace('  foundedYear: number | null;\n  headquarters: string | null;\n','').replace('    foundedYear: row.founded_year ? String(row.founded_year) : "",\n    headquarters: row.headquarters ?? "",\n','')
p.write_text(s)
# builder form remove blocks and numeric inputs
p=root/'src/app/dashboard/builders/new/components/AddBuilderForm.tsx'
s=p.read_text()
import re
s=re.sub(r'''\s*<div>\s*<FieldLabel required>Headquarters</FieldLabel>[\s\S]*?<FieldError message=\{errors\.headquarters\} />\s*</div>\s*<div>\s*<FieldLabel required>Founded Year</FieldLabel>[\s\S]*?<FieldError message=\{errors\.foundedYear\} />\s*</div>''','',s,count=1)
s=s.replace('placeholder="e.g. 38+ Years"','placeholder="e.g. 38"')
s=s.replace('placeholder="e.g. 300+ Projects"','placeholder="e.g. 300"')
# validation scroll exact section only two sections, basic is okay
p.write_text(s)
# builder validation section no other refs
# Fix locality edit mapper rows: toRows keys now adds infoUnit/priceUnit; okay

# Projects/localities list: remove Publish status column/badge and status filter? User said remove publish in list. Keep summary, but remove status column and status filter from toolbar to fully remove publish control/filter from list.
# Projects toolbar: remove status select, chip group, and status state handling is still page-compatible but no UI.
p=root/'src/app/dashboard/projects/components/FilterToolbar.tsx'
s=p.read_text()
s=s.replace('''const STATUSES = ["Ready to Move", "Under Construction", "New Launch"] as const;\n\n''','')
s=s.replace('  initialStatus: string;\n','')
s=s.replace('  initialStatus,\n','')
s=s.replace('    Boolean(initialStatus);','    false;')
s=s.replace('''        <FilterSelect
          value={initialStatus}
          onChange={(v) => updateParam("status", v)}
          placeholder="All Status"
          options={STATUSES.map((s) => ({ value: s, label: s }))}
        />
''','')
s=s.replace('''          <ChipGroup label="Status">
            {STATUSES.map((status) => (
              <FilterChip
                key={status}
                label={status}
                selected={initialStatus === status}
                onClick={() => toggleSingleValue("status", status, initialStatus)}
              />
            ))}
          </ChipGroup>
''','')
p.write_text(s)
# page stop passing initialStatus and status query
p=root/'src/app/dashboard/projects/page.tsx'; s=p.read_text().replace('  const status = firstValue(resolvedParams.status);\n','').replace('      status,\n','').replace(' || propertyType || status',' || propertyType'); s=s.replace('            initialStatus={status}\n',''); p.write_text(s)
# Projects table remove status column and badge
p=root/'src/app/dashboard/projects/components/ProjectsTable.tsx'; s=p.read_text()
s=re.sub(r'''\s*<col className="w-\[110px\]" />''','',s,count=1)
s=s.replace('            <th className="px-3 py-3 font-bold">Status</th>\n','')
s=s.replace('              <td className="px-3 py-2.5">\n                <PublishedBadge published={project.published} />\n              </td>\n','')
p.write_text(s)
# Localities toolbar remove status filter
p=root/'src/app/dashboard/localities/components/LocalityFilterToolbar.tsx'; s=p.read_text().replace('const STATUSES = ["Published", "Draft"] as const;\n\n','').replace('  initialStatus: string;\n','').replace('  initialStatus,\n','').replace('    Boolean(initialSearch) || Boolean(initialCity) || Boolean(initialStatus);','    Boolean(initialSearch) || Boolean(initialCity);')
s=re.sub(r'''\s*<FilterSelect\s*value=\{initialStatus\}[\s\S]*?options=\{STATUSES\.map\(\(s\) => \(\{ value: s, label: s \}\)\)\}\s*/>''','',s,count=1)
p.write_text(s)
# Localities page remove status
p=root/'src/app/dashboard/localities/page.tsx'; s=p.read_text().replace('  const status = firstValue(resolvedParams.status);\n','').replace('getLocalities(supabase, { search, city, status, page })','getLocalities(supabase, { search, city, page })').replace('const hasActiveFilters = Boolean(search || city || status);','const hasActiveFilters = Boolean(search || city);').replace('            initialStatus={status}\n',''); p.write_text(s)
# Localities table remove status column/badge
p=root/'src/app/dashboard/localities/components/LocalitiesTable.tsx'; s=p.read_text()
s=re.sub(r'''\s*<th className="w-\[15%\] px-4 py-3 font-bold">Status</th>''','',s,count=1)
s=s.replace('                  <PublishedBadge published={locality.published} />\n','')
s=s.replace('              <th className="w-[15%] px-4 py-3 font-bold">Status</th>\n','')
p.write_text(s)
