import { TIERS, TIER_INFO, type Tier } from "@/lib/constants";
import { formatMoney } from "@/lib/currency";

/**
 * Competitor list prices behind the landing page's price comparison.
 *
 * Only what was checked on public sources and can be said without
 * misleading anyone: what the cheapest paid plan costs, and whether unused
 * plan credits carry over. Per-generation prices are deliberately NOT
 * compared. On the flagship models (Seedance 2.5, Kling 3.0, Nano Banana
 * Pro) these platforms charged less per clip than credit-estimate.ts does
 * when this was written, and a blanket "cheaper" that only holds for the
 * subscription sticker would be misleading comparative advertising (EU
 * Directive 2006/114/EC art. 4, Code de la consommation L122-1). The page
 * says so in its footnote.
 *
 * Prices are monthly billing, USD. Re-check every figure before touching
 * PRICES_CHECKED_ON — a stale competitor price is the claim that gets a
 * comparison pulled.
 */
export const PRICES_CHECKED_ON = "September 2026";

export type Competitor = {
  name: string;
  entryPlan: string;
  /** Monthly-billing price of the cheapest paid plan. */
  entryPriceMonthly: number;
  /** Which plans roll unused credits over, or null when none do. */
  rollover: string | null;
  pricingUrl: string;
};

export const COMPETITORS: readonly Competitor[] = [
  {
    name: "Higgsfield",
    entryPlan: "Starter",
    entryPriceMonthly: 19,
    rollover: null,
    pricingUrl: "https://higgsfield.ai/pricing",
  },
  {
    name: "Runway",
    entryPlan: "Standard",
    entryPriceMonthly: 15,
    rollover: "Max plan only",
    pricingUrl: "https://runwayml.com/pricing",
  },
  {
    name: "OpenArt",
    entryPlan: "Starter",
    entryPriceMonthly: 14,
    rollover: null,
    pricingUrl: "https://openart.ai/pricing",
  },
];

/** Our side of the comparison, read off TIER_INFO so a repricing can't
 *  leave the page quoting an old number. */
const PAID_TIERS = TIERS.filter((tier) => TIER_INFO[tier].priceMonthly > 0);
export const ENTRY_TIER: Tier = PAID_TIERS[0];
export const ENTRY_PRICE_MONTHLY = TIER_INFO[ENTRY_TIER].priceMonthly;

/** The cheapest plan whose monthly grant rolls over. */
export const ROLLOVER_TIER: Tier | undefined = PAID_TIERS.find(
  (tier) => TIER_INFO[tier].renewsMonthly && TIER_INFO[tier].rolloverMonths > 0,
);

/** How much less a year our entry plan costs than theirs. Rounded down so
 *  the page never overstates it ($108.12 reads as $108). */
export function yearlySavings(competitor: Competitor): number {
  return Math.floor((competitor.entryPriceMonthly - ENTRY_PRICE_MONTHLY) * 12);
}

/** "$19" for a whole-dollar price, "$9.99" otherwise. */
export function formatListPrice(usd: number): string {
  const whole = Math.abs(usd - Math.round(usd)) < 1e-9;
  return formatMoney(usd, { maximumFractionDigits: whole ? 0 : 2 });
}
