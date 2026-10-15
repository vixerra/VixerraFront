"use client";

import { Check, Info } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useUnlimitedPromoEnabled } from "@/hooks/use-launch-offer";
import { UNLIMITED_FEATURE, UNLIMITED_TOOLTIP } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** `7-DAY UNLIMITED`, with the terms in its tooltip. */
export function UnlimitedBadge({ className }: { className?: string }) {
  return (
    <Tooltip content={UNLIMITED_TOOLTIP}>
      <button
        type="button"
        className={cn(
          "inline-flex w-fit items-center rounded-md border border-accent-amber-ink/40 bg-accent-amber/10 px-2 py-0.5 text-[10px] leading-4 font-bold tracking-[0.06em] text-accent-amber-ink uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-ink",
          className,
        )}
      >
        7-day unlimited
      </button>
    </Tooltip>
  );
}

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
  // The UNLIMITED_PROMO_ENABLED kill switch drops the line everywhere.
  const unlimitedOn = useUnlimitedPromoEnabled();
  const shown = features.filter((feature) => feature !== UNLIMITED_FEATURE || unlimitedOn);
  return (
    <div className={cn("flex flex-col", className)}>
      <ul className={sm ? "space-y-2" : "space-y-3"}>
        {shown.map((feature) => (
          <li
            key={feature}
            className={cn(
              "flex items-start gap-2 text-muted",
              sm ? "text-caption" : "text-body-sm",
            )}
          >
            <Check
              className={cn("mt-0.5 shrink-0 text-brand-ink", sm ? "size-3.5" : "size-4")}
              aria-hidden="true"
            />
            {feature === UNLIMITED_FEATURE ? (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink">
                {feature}
                <UnlimitedBadge />
              </span>
            ) : (
              feature
            )}
          </li>
        ))}
      </ul>
      {note && (
        <Tooltip content={note}>
          <button
            type="button"
            className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full text-caption text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-ink"
          >
            <Info className="size-3.5 shrink-0" aria-hidden="true" />
            How these are estimated
          </button>
        </Tooltip>
      )}
    </div>
  );
}
