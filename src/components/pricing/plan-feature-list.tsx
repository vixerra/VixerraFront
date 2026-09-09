"use client";

import { Check, Info } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The feature bullets on a plan card — shared by the pricing page, the landing
 * preview and the settings plan switcher, which all rendered the same list by
 * hand before.
 *
 * `note` (TIER_INFO.featuresNote) renders as one info bubble under the list
 * rather than a qualifier repeated inside every bullet: the "~N" figures are
 * all measured at the cheapest settings the plan's credits can be spent on, and
 * saying that once keeps the numbers themselves uncluttered.
 */
export function PlanFeatureList({
  features,
  note,
  size = "md",
  className,
}: {
  features: readonly string[];
  note?: string;
  /** "sm" matches the denser cards in settings. */
  size?: "sm" | "md";
  className?: string;
}) {
  const sm = size === "sm";
  return (
    <div className={cn("flex flex-col", className)}>
      <ul className={sm ? "space-y-2" : "space-y-3"}>
        {features.map((feature) => (
          <li
            key={feature}
            className={cn(
              "flex items-start gap-2 text-muted",
              sm ? "text-caption" : "text-body-sm",
            )}
          >
            <Check
              className={cn("mt-0.5 shrink-0 text-brand", sm ? "size-3.5" : "size-4")}
              aria-hidden="true"
            />
            {feature}
          </li>
        ))}
      </ul>
      {note && (
        <Tooltip content={note}>
          <button
            type="button"
            className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full text-caption text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
          >
            <Info className="size-3.5 shrink-0" aria-hidden="true" />
            How these are estimated
          </button>
        </Tooltip>
      )}
    </div>
  );
}
