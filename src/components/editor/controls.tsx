"use client";

import { type ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The small, repeated controls the inspector is built out of.
 *
 * An editor panel is fifty variations on "label, control, current value",
 * and writing that by hand fifty times is how the spacing drifts and half
 * the sliders end up without a way to get back to their default. They live
 * here so the panels read as a list of settings rather than a wall of divs.
 */

export function PanelSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border-subtle px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-caption font-medium tracking-wide text-text-tertiary uppercase">
          {title}
        </h3>
        {action}
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-caption text-muted">{label}</p>
      {children}
    </div>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  defaultValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  /** Shows a reset affordance once the value has moved off it. */
  defaultValue?: number;
}) {
  const dirty = defaultValue !== undefined && Math.abs(value - defaultValue) > 1e-6;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-caption text-muted">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-caption text-ink-soft tabular-nums">
            {format ? format(value) : value.toFixed(2)}
          </span>
          {dirty && (
            <Tooltip content="Reset">
              <button
                type="button"
                onClick={() => onChange(defaultValue)}
                aria-label={`Reset ${label}`}
                className="rounded-full p-0.5 text-text-tertiary transition-colors hover:text-ink"
              >
                <RotateCcw className="size-3" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
      />
    </div>
  );
}

// `string | number` rather than plain `string`: frame rate is a number
// (24/30/60) and forcing it through a string here would mean parsing it back
// at every call site.
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  columns,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  /** Wraps onto a grid instead of one row — for option sets too long to sit
   *  side by side in a 320px panel. */
  columns?: number;
}) {
  return (
    <div
      className={cn(
        "gap-1 rounded-xl border border-border-subtle bg-surface-dark p-1",
        columns ? "grid" : "flex",
      )}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      role="group"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          title={option.hint}
          className={cn(
            "min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-caption font-medium transition-colors",
            value === option.value
              ? "bg-brand/15 text-brand"
              : "text-muted hover:bg-white/5 hover:text-ink-soft",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The handful of colours a caption or watermark actually wants, plus an
 *  escape hatch to the OS picker for a brand colour that isn't in the set. */
const SWATCHES = [
  "#ffffff",
  "#050506",
  "#bbdc12",
  "#ffd400",
  "#ff8f00",
  "#ff0052",
  "#56a8e8",
  "#3fbe80",
];

export function ColorRow({
  label,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Empty string as a valid value — used by the caption box, where "no
   *  background" is a real choice and not a missing one. */
  allowNone?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-caption text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="No colour"
            aria-pressed={value === ""}
            className={cn(
              "relative size-6 overflow-hidden rounded-md border transition-colors",
              value === "" ? "border-brand" : "border-line hover:border-border-strong",
            )}
          >
            <span className="absolute top-1/2 left-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-accent" />
          </button>
        )}
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => onChange(swatch)}
            aria-label={swatch}
            aria-pressed={value.toLowerCase() === swatch}
            className={cn(
              "size-6 rounded-md border transition-transform",
              value.toLowerCase() === swatch
                ? "border-brand scale-110"
                : "border-line hover:border-border-strong",
            )}
            style={{ backgroundColor: swatch }}
          />
        ))}
        <label className="relative size-6 cursor-pointer overflow-hidden rounded-md border border-line">
          <span
            className="block size-full"
            style={{
              background:
                "conic-gradient(#ff0052,#ffd400,#bbdc12,#3fbe80,#56a8e8,#ff0052)",
            }}
          />
          <input
            type="color"
            value={value || "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} — custom colour`}
          />
        </label>
      </div>
    </div>
  );
}

export function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center text-body-sm text-muted">{children}</div>
  );
}
