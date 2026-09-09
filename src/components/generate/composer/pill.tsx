"use client";

import { type ReactNode } from "react";
import { Check, ChevronDown, Lock, type LucideIcon } from "lucide-react";
import {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
} from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Shared trigger style for every pill in the composer toolbar — boxy
 * rounded-lg rather than a full pill, matching ArtCraft's own secondary
 * controls (their primary CTA stays full-pill, see CreditsSubmitPill). A
 * small hover lift + press-down scale (same feel as CreditsSubmitPill's own
 * hover:-translate-y-px) makes the whole row feel like one tactile system
 * instead of static boxes. */
export const pillClass = cn(
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5",
  "text-label text-ink-soft transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out",
  "hover:border-border-strong hover:bg-surface-3 hover:-translate-y-px hover:shadow-raised",
  "active:translate-y-0 active:scale-[0.98]",
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-line disabled:hover:bg-surface-2 disabled:hover:shadow-none",
);

/** Wraps a disabled pill with a tooltip explaining why — used instead of a
 * native `title` attribute so it matches the rest of the app's floating UI.
 * The extra `span` matters: disabled elements don't fire pointer events, so
 * the hover target has to be the (non-disabled) wrapper around the button. */
export function DisabledPillHint({ hint, children }: { hint?: string; children: ReactNode }) {
  if (!hint) return <>{children}</>;
  return (
    <Tooltip content={hint}>
      <span className="inline-flex" tabIndex={0}>
        {children}
      </span>
    </Tooltip>
  );
}

/** A pill that opens a single-select list — duration, resolution, aspect ratio, ... */
export function PillSelect<T extends string | number>({
  icon: Icon,
  label,
  value,
  options,
  renderLabel,
  renderHint,
  onChange,
  disabled,
  disabledHint,
  isOptionLocked,
  lockedHint,
}: {
  icon: LucideIcon;
  /** Field name, shown as the list's header. The pill itself only has room
   * for the current value, so without this a bare "2K" or "16:9" leaves you
   * guessing which setting you just opened. */
  label?: string;
  value: T;
  options: readonly T[];
  renderLabel?: (v: T) => string;
  /** Plain-language gloss for a raw provider value ("Full HD" for "fhd") -
   * see valueHint in composer-fields.ts. */
  renderHint?: (v: T) => string | undefined;
  onChange: (v: T) => void;
  disabled?: boolean;
  disabledHint?: string;
  /** Per-option gate (e.g. a resolution above the current plan's limit) —
   * unlike `disabled` (which locks the whole pill), a locked option still
   * shows up in the list with a lock icon so upgrading is discoverable. */
  isOptionLocked?: (v: T) => boolean;
  /** Tooltip text for a locked option, e.g. "Upgrade to Starter to unlock 720p." */
  lockedHint?: (v: T) => string;
}) {
  const display = renderLabel ? renderLabel(value) : String(value);
  const trigger = (
    <DropdownTrigger asChild>
      <button type="button" disabled={disabled} className={pillClass}>
        <Icon className="size-3.5 text-muted" aria-hidden="true" />
        <span className="font-medium">{display}</span>
        <ChevronDown className="size-3 text-muted" aria-hidden="true" />
      </button>
    </DropdownTrigger>
  );
  return (
    <DropdownRoot>
      {disabled ? (
        <DisabledPillHint hint={disabledHint}>{trigger}</DisabledPillHint>
      ) : (
        trigger
      )}
      <DropdownContent align="start" className="max-h-72 w-56 overflow-y-auto">
        {label && <DropdownLabel>{label}</DropdownLabel>}
        {options.map((opt) => {
          const locked = isOptionLocked?.(opt) ?? false;
          const hint = renderHint?.(opt);
          const item = (
            <DropdownItem
              key={String(opt)}
              disabled={locked}
              onSelect={(e) => {
                if (locked) {
                  e.preventDefault();
                  return;
                }
                onChange(opt);
              }}
              className={cn(
                "flex items-center gap-2 py-2.5",
                locked && "cursor-not-allowed opacity-50 data-[highlighted]:bg-transparent data-[highlighted]:text-ink-soft",
              )}
            >
              <Check
                className={cn("size-3.5 shrink-0", opt === value ? "text-brand" : "text-transparent")}
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="truncate">{renderLabel ? renderLabel(opt) : String(opt)}</span>
                {hint && <span className="ml-auto shrink-0 text-caption text-muted">{hint}</span>}
              </span>
              {locked && <Lock className="size-3.5 shrink-0 text-muted" aria-hidden="true" />}
            </DropdownItem>
          );
          return locked && lockedHint ? (
            <Tooltip key={String(opt)} content={lockedHint(opt)}>
              <span className="block">{item}</span>
            </Tooltip>
          ) : (
            item
          );
        })}
      </DropdownContent>
    </DropdownRoot>
  );
}

/** A labeled row in the panel's settings list — pairs a field's pill
 * control (or a switch) with its name, since the pill alone (icon + value,
 * no label) doesn't carry enough context outside a labeled toolbar. Draws
 * its own bottom border so a stack of rows reads as a list; wrap the stack
 * in PanelFieldList (see panel.tsx) for the grouped frame. */
export function FieldRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-label text-ink-soft">{label}</p>
        {description && <p className="mt-0.5 text-caption text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
