"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import GoldSelect from "@/app/dashboard/components/form/GoldSelect";

const inputBase =
  "w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300";
const inputBorder = (hasError?: boolean) =>
  hasError ? "border-red-300" : "border-line";

export function FieldLabel({
  children,
  required,
  optional,
}: {
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {required && <span className="text-red-500"> *</span>}
      {optional && <span className="font-normal text-muted"> (Optional)</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputBase} ${inputBorder(Boolean(error))} disabled:cursor-not-allowed disabled:opacity-60`}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`${inputBase} ${inputBorder(Boolean(error))} resize-y`}
      />
      {maxLength && (
        <p className="mt-1 text-right text-xs text-gray-300">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  error?: string;
}) {
  return (
    <GoldSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      hasError={Boolean(error)}
    />
  );
}

export function RadioPillGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      {options.map((opt) => (
        <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="h-4 w-4 accent-[#c9a24d]"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-block h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
          checked ? "bg-gold" : "bg-line"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function TagListInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className={`${inputBase} ${inputBorder(false)}`}
        />
        <button
          type="button"
          onClick={addTag}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-dark"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((val, idx) => (
            <span
              key={`${val}-${idx}`}
              className="flex items-center gap-1.5 rounded-full bg-gold-light/40 px-3 py-1.5 text-xs font-semibold text-navy"
            >
              {val}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== idx))}
                aria-label={`Remove ${val}`}
                className="text-navy/60 hover:text-navy"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RepeatableRows<T extends Record<string, string>>({
  rows,
  onChange,
  fields,
  emptyRow,
  addLabel,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  fields: { key: keyof T; placeholder: string }[];
  emptyRow: T;
  addLabel: string;
}) {
  function updateRow(index: number, key: keyof T, value: string) {
    const next = rows.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row, idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {fields.map((f) => (
            <input
              key={String(f.key)}
              type="text"
              value={row[f.key]}
              onChange={(e) => updateRow(idx, f.key, e.target.value)}
              placeholder={f.placeholder}
              className={`${inputBase} ${inputBorder(false)} flex-1 min-w-[140px]`}
            />
          ))}
          <button
            type="button"
            onClick={() => removeRow(idx)}
            aria-label="Remove row"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:bg-surface hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...rows, emptyRow])}
        className="flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
}
