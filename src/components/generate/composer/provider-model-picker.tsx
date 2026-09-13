"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { DropdownRoot, DropdownTrigger, DropdownContent } from "@/components/ui/dropdown";
import { ProviderLogo } from "./provider-logo";
import { pillClass } from "./pill";
import { cn } from "@/lib/utils";
import { getModelBadges } from "@/lib/model-meta";

export type PickerModel<T extends string> = {
  id: T;
  label: string;
  provider?: string;
  description: string;
};

/**
 * Model picker grouped by provider: the trigger shows the selected model's
 * provider logo, the panel lists providers first (with logo + model count),
 * and clicking one expands its models inline — accordion-style, one
 * provider open at a time, defaulting to whichever provider owns the
 * current selection.
 */
export function ProviderModelPicker<T extends string>({
  models,
  value,
  onChange,
  fullWidth,
}: {
  models: readonly PickerModel<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Panel variant: the trigger spans its container as a select-style row
   * (logo + name left, chevron right) instead of a compact toolbar pill. */
  fullWidth?: boolean;
}) {
  const selected = models?.find((m) => m.id === value) ?? models[0];

  const groups = useMemo(() => {
    const map = new Map<string, PickerModel<T>[]>();
    for (const m of models) {
      const key = m.provider ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries());
  }, [models]);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(selected.provider ?? groups[0]?.[0] ?? "");

  return (
    <DropdownRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setExpanded(selected.provider ?? groups[0]?.[0] ?? "");
      }}
    >
      <DropdownTrigger asChild>
        <button
          type="button"
          className={cn(pillClass, fullWidth && "w-full rounded-xl bg-surface-dark px-3.5 py-2.5")}
        >
          <ProviderLogo provider={selected.provider ?? "?"} size="sm" />
          <span className={cn("truncate font-medium", fullWidth ? "flex-1 text-left" : "max-w-[9rem]")}>
            {selected.label}
          </span>
          <ChevronDown className="size-3 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="start" className="max-h-96 w-80 overflow-y-auto p-1.5">
        {groups.map(([provider, providerModels]) => {
          const isExpanded = expanded === provider;
          return (
            <div key={provider} className="mb-1 last:mb-0">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? "" : provider)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-dropdown-hover"
              >
                <ProviderLogo provider={provider} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label font-medium text-ink-soft">{provider}</span>
                  <span className="block text-caption text-muted">
                    {providerModels.length} model{providerModels.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 text-muted transition-transform",
                    isExpanded && "rotate-90",
                  )}
                  aria-hidden="true"
                />
              </button>
              {isExpanded && (
                <div className="mt-1 ml-4 space-y-0.5 border-l border-line pl-3">
                  {providerModels.map((model) => {
                    const specBadges = getModelBadges(model.id);
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onChange(model.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-dropdown-hover"
                      >
                        <Check
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            model.id === value ? "text-brand" : "text-transparent",
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-label text-ink-soft">{model.label}</span>
                          </span>
                          {specBadges.length > 0 ? (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {specBadges.map((b) => (
                                <span
                                  key={b.label}
                                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] leading-4 text-muted"
                                >
                                  <b.icon className="size-2.5" aria-hidden="true" />
                                  {b.label}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="mt-0.5 line-clamp-1 block text-caption text-muted">
                              {model.description}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </DropdownContent>
    </DropdownRoot>
  );
}
