// Every sentence on the site that quotes a plan price.
//
// The numbers themselves live in lib/constants.ts (TIER_INFO, ANNUAL_PRICE,
// LAUNCH_OFFER), twinned with the API, which is what Stripe and the credit
// grants follow. This module only turns them into copy, so the homepage FAQ,
// the pricing FAQ, the model pages, the guides, the CTAs and the meta
// descriptions all say the same thing — and say WHICH price they mean. The
// plan cards show the launch and annual prices; a bare "$10 / $24 / $49"
// next to them read as a contradiction.

import {
  ANNUAL_PRICE,
  ANNUAL_PRICE_MONTHLY,
  LAUNCH_OFFER,
  PAID_TIERS,
  TIER_INFO,
  type PaidTier,
} from "@/lib/constants";
import { formatMoney } from "@/lib/currency";

/** "$10" for a whole-dollar price, "$9.99" otherwise. */
export function usd(amount: number): string {
  const whole = Math.abs(amount - Math.round(amount)) < 1e-9;
  return formatMoney(amount, { maximumFractionDigits: whole ? 0 : 2 });
}

const credits = (n: number) => n.toLocaleString("en-US");

/** The plan everyone can start on. */
export const ENTRY_PLAN = TIER_INFO[PAID_TIERS[0]];

/** "$10/month" — the entry plan's list price. */
export const ENTRY_PRICE_LABEL = `${usd(ENTRY_PLAN.priceMonthly)}/month`;

/** The launch offer, as one clause: "$6/month for the first 20 Starter subscribers". */
export const LAUNCH_OFFER_CLAUSE = `${usd(LAUNCH_OFFER.priceMonthly)}/month for the first ${LAUNCH_OFFER.places} ${TIER_INFO[LAUNCH_OFFER.tier].label} subscribers, locked in while they stay subscribed`;

/**
 * One plan's price, with every variant it has:
 *   "Starter is $10/month for 1,000 credits ($6/month for the first 20 …)"
 *   "Creator is $24/month for 2,500 credits, or $20/month billed annually ($240/year)"
 */
export function planPriceSentence(tier: PaidTier): string {
  const info = TIER_INFO[tier];
  let sentence = `${info.label} is ${usd(info.priceMonthly)}/month for ${credits(info.monthlyCredits)} credits`;
  const yearly = ANNUAL_PRICE[tier];
  const yearlyMonthly = ANNUAL_PRICE_MONTHLY[tier];
  if (yearly !== undefined && yearlyMonthly !== undefined) {
    sentence += `, or ${usd(yearlyMonthly)}/month billed annually (${usd(yearly)}/year)`;
  }
  if (LAUNCH_OFFER.tier === tier) {
    sentence += ` (launch offer: ${LAUNCH_OFFER_CLAUSE})`;
  }
  return sentence;
}

/** Every paid plan, one sentence each, joined. */
export function pricingSummary(): string {
  return `${PAID_TIERS.map(planPriceSentence).join(". ")}.`;
}

/** The entry plan only, for pages that just need "how do I start". */
export function entryPriceSentence(): string {
  return `${planPriceSentence(PAID_TIERS[0])}.`;
}

/** What it takes to start generating. */
export function howToStartSentence(): string {
  return `Generating needs a plan — there is no free tier. ${entryPriceSentence()}`;
}

/** The answer to "Is there a free plan?", wherever that question is asked. */
export function freePlanAnswer(): string {
  return `No — generating starts with a paid plan. ${entryPriceSentence()} The gallery is open without an account, so you can see what the models make before you subscribe. If you already had free credits, they stay valid until you use them.`;
}

/** Short line for CTAs and meta descriptions: "Plans from $10/month". */
export const PLANS_FROM_LABEL = `Plans from ${ENTRY_PRICE_LABEL}`;
