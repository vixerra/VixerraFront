"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Box,
  Check,
  LayoutGrid,
  MonitorPlay,
  Smartphone,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { StylePreview } from "./style-preview";
import { cn } from "@/lib/utils";
import {
  MARKETING_CATEGORIES,
  searchStyles,
  stylesInCategory,
  type MarketingCategoryId,
  type MarketingKind,
  type MarketingStyle,
} from "@/lib/marketing-styles";

const CATEGORY_ICONS: Record<MarketingCategoryId, LucideIcon> = {
  "product-shot": Box,
  ads: MonitorPlay,
  marketplace: LayoutGrid,
  ugc: Smartphone,
  motion: Waves,
};

const KIND_LABEL: Record<MarketingKind, string> = { image: "Image", video: "Video" };
const KINDS: MarketingKind[] = ["image", "video"];

/**
 * The studio's style library — a category rail on the left, a searchable grid
 * of style tiles on the right.
 *
 * Categories are grouped by what they produce (Image / Video) rather than
 * listed flat, because that grouping is the one thing a pick here actually
 * changes downstream: it decides the endpoint, the model list, and whether a
 * product + talent pair can travel as one composited reference sheet at all.
 */
export function StylePicker({
  open,
  onOpenChange,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: MarketingStyle;
  onSelect: (style: MarketingStyle) => void;
}) {
  const [category, setCategory] = useState<MarketingCategoryId>(value.category);
  const [query, setQuery] = useState("");

  const searching = query.trim().length > 0;
  const results = useMemo(
    () => (searching ? searchStyles(query) : stylesInCategory(category)),
    [searching, query, category],
  );
  const activeCategory = MARKETING_CATEGORIES.find((c) => c.id === category);

  function choose(style: MarketingStyle) {
    onSelect(style);
    setQuery("");
    onOpenChange(false);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // Reopening lands on the selected style's own category rather than
        // wherever the last browse left off — the picker is a place you come
        // back to, not a place you resume.
        if (next) {
          setCategory(value.category);
          setQuery("");
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[60] flex h-[85vh] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2",
            "flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-modal focus:outline-none",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-feature-title font-bold text-ink">
                Choose style
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-caption text-muted">
                Every style is a finished look — you supply the product, the talent and the words.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close style picker">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Category rail — a scrollable chip row below md, where a 14rem
                sidebar would eat half the grid. */}
            <div className="shrink-0 border-b border-line p-3 md:w-56 md:border-r md:border-b-0 md:p-4">
              <div className="flex gap-2 overflow-x-auto md:flex-col md:gap-0 md:overflow-visible">
                {KINDS.map((kind) => (
                  <div key={kind} className="contents md:mb-4 md:block">
                    <p className="hidden px-3 pb-2 text-caption font-medium tracking-wide text-text-tertiary uppercase md:block">
                      {KIND_LABEL[kind]}
                    </p>
                    <div className="flex gap-2 md:flex-col md:gap-1">
                      {MARKETING_CATEGORIES.filter((c) => c.kind === kind).map((c) => {
                        const Icon = CATEGORY_ICONS[c.id];
                        const active = !searching && c.id === category;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setCategory(c.id);
                            }}
                            className={cn(
                              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-label font-medium whitespace-nowrap transition-colors",
                              active
                                ? "bg-brand/10 text-ink"
                                : "text-muted hover:bg-white/5 hover:text-ink-soft",
                            )}
                          >
                            <Icon
                              className={cn("size-4 shrink-0", active ? "text-brand" : "text-muted")}
                              aria-hidden="true"
                            />
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid side */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
                <div className="min-w-0">
                  <h3 className="text-body font-semibold text-ink">
                    {searching ? "Search results" : activeCategory?.label}
                  </h3>
                  <p className="mt-0.5 truncate text-caption text-muted">
                    {searching
                      ? `${results.length} style${results.length === 1 ? "" : "s"} matching “${query.trim()}”`
                      : activeCategory?.blurb}
                  </p>
                </div>
                <SearchInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  aria-label="Search styles"
                  className="w-full sm:w-64"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-5">
                {results.length === 0 ? (
                  <p className="py-16 text-center text-body-sm text-muted">
                    No style matches that. Try “product”, “sale”, “amazon” or “tiktok”.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {results.map((style) => (
                      <StyleCard
                        key={style.id}
                        style={style}
                        selected={style.id === value.id}
                        onSelect={() => choose(style)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StyleCard({
  style,
  selected,
  onSelect,
}: {
  style: MarketingStyle;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="group text-left">
      <div
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-xl border transition-[border-color,box-shadow,transform] duration-300",
          selected
            ? "border-brand shadow-glow-sm"
            : "border-line group-hover:-translate-y-1 group-hover:border-brand/40 group-hover:shadow-glow-sm",
        )}
      >
        <StylePreview style={style} />
        {selected && (
          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-brand text-on-brand shadow-glow-sm">
            <Check className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-label font-semibold text-ink">{style.name}</p>
      <p className="truncate text-caption text-muted">{style.blurb}</p>
    </button>
  );
}
