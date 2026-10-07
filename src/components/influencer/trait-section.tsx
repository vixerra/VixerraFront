"use client";

import { createElement } from "react";
import Image from "next/image";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupHasImages, traitImage } from "@/lib/influencer-trait-images";
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
 * Groups with photo tiles (lib/influencer-trait-images.ts) show each option
 * as a picture with its label under it; an option still missing its photo
 * gets the group's icon in its place, so the grid stays even.
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
  const pictures = groupHasImages(group.id);

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
            if (pictures) {
              const src = traitImage(group.id, option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChange(togglePick(picks, group, option.id))}
                  disabled={atCap}
                  aria-pressed={selected}
                  className={cn(
                    "group/tile relative flex flex-col overflow-hidden rounded-xl border text-center transition-[border-color,box-shadow]",
                    "disabled:cursor-not-allowed disabled:opacity-35",
                    selected
                      ? "border-brand shadow-glow-sm"
                      : "border-line hover:border-border-strong",
                  )}
                >
                  <span className="relative block aspect-square w-full overflow-hidden bg-[#ededed]">
                    {src ? (
                      // Already 165px WebP at a few KB: the optimizer would
                      // only add a round trip per tile.
                      <Image
                        src={src}
                        alt=""
                        width={165}
                        height={165}
                        unoptimized
                        className="size-full object-cover transition-transform duration-300 group-hover/tile:scale-105"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center bg-surface-3">
                        {createElement(groupIcon(group.id), {
                          className: "size-6 text-text-tertiary",
                          "aria-hidden": true,
                        })}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "px-1 py-1.5 text-[11px] leading-tight font-medium",
                      selected ? "bg-brand/10 text-ink" : "bg-surface-3 text-muted group-hover/tile:text-ink-soft",
                    )}
                  >
                    {option.label}
                  </span>
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-on-brand shadow-sm">
                      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            }
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
