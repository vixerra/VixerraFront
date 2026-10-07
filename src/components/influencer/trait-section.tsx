"use client";

import { createElement } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  groupIcon,
  isPicked,
  pickCount,
  togglePick,
  type TraitGroup,
  type TraitPicks,
} from "@/lib/influencer";

/**
 * One collapsible block of the builder: a header with the group's size and
 * how many are picked, and a grid of tiles. Colour groups (anything whose
 * options carry a swatch) render a chip of the colour instead of a plain
 * label tile, which is the one place the picture says more than the word.
 *
 * Every group is optional: nothing picked leaves that trait to the model.
 * A second click on a single-pick tile clears it for the same reason.
 */
export function TraitSection({
  group,
  picks,
  open,
  onToggleOpen,
  onChange,
}: {
  group: TraitGroup;
  picks: TraitPicks;
  open: boolean;
  onToggleOpen: () => void;
  onChange: (next: TraitPicks) => void;
}) {
  const count = pickCount(picks, group.id);
  const swatches = group.options.some((o) => o.swatch);

  function clear() {
    const next = { ...picks };
    delete next[group.id];
    onChange(next);
  }

  return (
    <section className="border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-2 py-3">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {createElement(groupIcon(group.id), { className: "size-4 shrink-0 text-muted", "aria-hidden": true })}
          <span className="truncate text-label font-medium text-ink-soft">{group.label}</span>
          <span className="text-caption text-text-tertiary">{group.options.length}</span>
          {count > 0 && (
            <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-brand">
              {group.multi ? `${count}/${group.multi}` : "1"}
            </span>
          )}
        </button>
        {count > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-caption text-muted transition-colors hover:text-ink-soft"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label={open ? `Collapse ${group.label}` : `Expand ${group.label}`}
          className="text-muted transition-colors hover:text-ink-soft"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className={cn("grid gap-2 pb-4", swatches ? "grid-cols-4" : "grid-cols-3")}>
          {group.options.map((option) => {
            const selected = isPicked(picks, group.id, option.id);
            const atCap = Boolean(group.multi) && !selected && count >= (group.multi ?? 0);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(togglePick(picks, group, option.id))}
                disabled={atCap}
                aria-pressed={selected}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 text-center transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-35",
                  selected
                    ? "border-brand bg-brand/10 text-ink"
                    : "border-line bg-surface-3 text-muted hover:border-border-strong hover:text-ink-soft",
                )}
              >
                {option.swatch && (
                  <span
                    className="size-7 rounded-full border border-white/15 shadow-inner"
                    // background, not backgroundColor: a few swatches (two-tone,
                    // rainbow) are gradients.
                    style={{ background: option.swatch }}
                    aria-hidden="true"
                  />
                )}
                <span className="text-[11px] font-medium leading-tight">{option.label}</span>
                {selected && (
                  <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-brand text-on-brand">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
