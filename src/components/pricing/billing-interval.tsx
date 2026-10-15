"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { LaunchOfferPrice } from "@/components/landing/launch-offer";
import {
  ANNUAL_PRICE,
  ANNUAL_PRICE_MONTHLY,
  LAUNCH_OFFER,
  TIER_INFO,
  annualSavings,
  type BillingInterval,
  type Tier,
} from "@/lib/constants";
import { formatListPrice } from "@/lib/competitor-pricing";
import { cn } from "@/lib/utils";

/**
 * Monthly or annual, for a whole plan grid. Annual is the default: it is the
 * better deal for the buyer (up to two months free) and the one we'd rather sell.
 * Starter has no annual price and shows its monthly one either way.
 */
type IntervalState = { interval: BillingInterval; setInterval: (interval: BillingInterval) => void };

const IntervalContext = createContext<IntervalState | null>(null);

export function BillingIntervalProvider({
  children,
  initial = "annual",
  value,
  onChange,
}: {
  children: ReactNode;
  initial?: BillingInterval;
  /** Controlled mode, for a parent that needs the interval itself (the
   *  billing page's plan switcher sends it to the API). */
  value?: BillingInterval;
  onChange?: (interval: BillingInterval) => void;
}) {
  const [own, setOwn] = useState<BillingInterval>(initial);
  const interval = value ?? own;
  const setInterval = onChange ?? setOwn;
  return <IntervalContext.Provider value={{ interval, setInterval }}>{children}</IntervalContext.Provider>;
}

/** The grid's interval; monthly outside a provider. */
export function useBillingInterval(): BillingInterval {
  return useContext(IntervalContext)?.interval ?? "monthly";
}

/** The interval a plan is actually sold on: annual only where it exists. */
export function intervalFor(tier: Tier, interval: BillingInterval): BillingInterval {
  return interval === "annual" && ANNUAL_PRICE[tier] !== undefined ? "annual" : "monthly";
}

/** `Monthly | Annual — up to 2 months free`, a two-option radio group.
 *  "Up to": Creator saves two months, Studio a little less. */
export function BillingIntervalToggle({ className }: { className?: string }) {
  const context = useContext(IntervalContext);
  if (!context) return null;
  const options: { value: BillingInterval; label: ReactNode }[] = [
    { value: "monthly", label: "Monthly" },
    {
      value: "annual",
      label: (
        <>
          Annual
          <span className="ml-1.5 normal-case tracking-normal text-accent-amber-ink">— up to 2 months free</span>
        </>
      ),
    },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Billing period"
      className={cn("inline-flex rounded-full border border-line bg-ink/[0.04] p-1", className)}
    >
      {options.map((option) => {
        const selected = context.interval === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => context.setInterval(option.value)}
            className={cn(
              "rounded-full px-4 py-2 text-caption font-bold tracking-wide uppercase transition-colors",
              selected ? "bg-surface-3 text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A plan card's price for the grid's interval:
 *
 *   monthly  $24 /month
 *   annual   $20 /month, billed annually
 *            Save $48 compared to monthly
 *
 * Starter shows its launch offer (or list price) and "Billed monthly" on the
 * annual view, since it has no yearly price to show.
 */
export function PlanCardPrice({
  tier,
  className,
  priceClassName,
  suffixClassName,
}: {
  tier: Tier;
  className?: string;
  priceClassName?: string;
  suffixClassName?: string;
}) {
  const interval = intervalFor(tier, useBillingInterval());
  const gridInterval = useBillingInterval();
  const info = TIER_INFO[tier];

  if (tier === LAUNCH_OFFER.tier) {
    return (
      <div className={className}>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <LaunchOfferPrice className={priceClassName} suffixClassName={suffixClassName} />
        </p>
        {gridInterval === "annual" && <p className="mt-1 text-caption text-muted">Billed monthly</p>}
      </div>
    );
  }

  if (interval === "annual") {
    const monthly = ANNUAL_PRICE_MONTHLY[tier] ?? info.priceMonthly;
    return (
      <div className={className}>
        <p className="flex flex-wrap items-baseline gap-x-1">
          <span className={priceClassName}>{formatListPrice(monthly)}</span>
          <span className={suffixClassName}>/month, billed annually</span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted">
          <Badge variant="success">Save {formatListPrice(annualSavings(tier))}</Badge>
          compared to monthly · {formatListPrice(ANNUAL_PRICE[tier] ?? 0)}/year
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* formatListPrice, like the annual figure, so toggling doesn't turn
          "$20" into "$24.00". */}
      <p className="flex items-baseline gap-1">
        <span className={priceClassName}>{formatListPrice(info.priceMonthly)}</span>
        <span className={suffixClassName}>/month</span>
      </p>
    </div>
  );
}
