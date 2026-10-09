export const PROJECT_SIZE_UNITS = ["Acres", "Guntas", "Cents", "Sq Ft"] as const;
export type ProjectSizeUnit = (typeof PROJECT_SIZE_UNITS)[number];

function cleanNumber(value: string | number | null | undefined): string {
  if (value == null) return "";
  const raw = String(value).trim().replace(/,/g, "");
  if (!raw) return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return Number.isInteger(n) ? String(n) : String(n);
}

export function formatMoney(value: string | number | null | undefined, unit = "L") {
  const n = cleanNumber(value);
  if (!n) return "";
  return `₹${n}${unit}`;
}

export function formatPriceRange(
  min: string | number | null | undefined,
  max: string | number | null | undefined,
  unit: string,
  priceType = "Price Range",
) {
  const left = formatMoney(min, unit);
  const right = formatMoney(max, unit);
  if (!left && !right) return "";
  if (priceType === "Fixed Price" || !right || left === right) return left || right;
  return `${left} - ${right}`;
}

export function normalizePriceDisplay(value: string, fallback?: string) {
  const raw = value.trim();
  if (!raw) return fallback ?? "";
  // Existing projects may already contain a complete display value. Never append
  // another currency/unit suffix to an already formatted value.
  if (/₹\s*\d[\d,.]*\s*(?:L|Cr)\b/i.test(raw)) return raw;
  return raw;
}

export function formatArea(value: string | number | null | undefined, unit = "sq.ft.") {
  const n = cleanNumber(value);
  return n ? `${Number(n).toLocaleString("en-IN")}${unit ? ` ${unit}` : ""}` : "";
}

export function formatProjectSize(value: string | number | null | undefined, unit = "Acres") {
  const n = cleanNumber(value);
  return n ? `${n} ${unit}` : "";
}

export function formatDistance(value: string | number | null | undefined, unit = "km") {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/\b(?:km|m|mi)\b/i.test(raw)) return raw;
  return `${cleanNumber(raw)} ${unit}`;
}

export function formatConfigurationArea(value: string | number | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return /sq\.?\s*ft|sqft/i.test(raw) ? raw : formatArea(raw, "sq.ft.");
}

export function formatConfigurationPrice(value: string | number | null | undefined, defaultUnit = "L") {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/₹\s*\d[\d,.]*\s*(?:L|Cr)\b/i.test(raw)) return raw;
  const match = raw.match(/^([\d,.]+)\s*(L|Cr)?$/i);
  if (!match) return raw;
  return formatMoney(match[1], match[2] || defaultUnit);
}
