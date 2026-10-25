/**
 * Partner links: any page with ?promo=CODE (vixlens.com/?promo=CODE,
 * /generate/…?promo=CODE, a signup link) remembers the code in a cookie, so
 * the visitor doesn't have to keep the query string while they look around,
 * sign up and pick a plan. src/proxy.ts sets it; the pricing page and billing
 * apply it on arrival like a ?promo= of their own (PromoCodeField's
 * autoApply).
 *
 * Nothing here is trusted: the cookie only pre-fills the field, and the API
 * checks the code again for the account and again at purchase.
 *
 * In production the cookie is set on the parent domain, so a code picked up
 * on the public site is still there on the app host (see proxy.ts).
 */
export const PROMO_COOKIE = "vx_promo";
export const PROMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
/** Same rule as the API's PROMO_CODE_PATTERN, so junk never gets stored. */
export const PROMO_LINK_PATTERN = /^[A-Z0-9_-]{3,32}$/;

export function normalizePromoParam(raw: string | null | undefined): string | null {
  const code = raw?.trim().toUpperCase();
  return code && PROMO_LINK_PATTERN.test(code) ? code : null;
}

/** The code a partner link left behind. Null on the server. */
export function rememberedPromo(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${PROMO_COOKIE}=([^;]*)`));
  return normalizePromoParam(match ? decodeURIComponent(match[1]) : null);
}

/** Drops the remembered code — once it's refused or the customer removes it,
 *  so it doesn't come back on the next visit. */
export function forgetPromo() {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const parent = host === "vixlens.com" || host.endsWith(".vixlens.com") ? "; domain=.vixlens.com" : "";
  document.cookie = `${PROMO_COOKIE}=; path=/; max-age=0${parent}`;
  // A host-only copy too, in case one was set before the domain was.
  document.cookie = `${PROMO_COOKIE}=; path=/; max-age=0`;
}
