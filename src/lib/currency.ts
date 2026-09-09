// Every Stripe price is created in USD (see the backend's
// scripts/stripe-setup.ts), so a card is always charged in dollars — and
// the app displays dollars everywhere to match.
export const CURRENCY_SYMBOL = "$";

export function formatMoney(amountUsd: number, opts: { maximumFractionDigits?: number } = {}) {
  const maximumFractionDigits = opts.maximumFractionDigits ?? 2;
  const minimumFractionDigits = amountUsd === 0 ? 0 : Math.min(2, maximumFractionDigits);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amountUsd);
  return `${CURRENCY_SYMBOL}${formatted}`;
}
