import type { Tier } from "@/lib/constants";

/**
 * Links that cross the two hostnames.
 *
 * The public site and the app run on one deployment under two hosts (see
 * src/proxy.ts). A `<Link href="/login">` is same-origin whichever host you
 * are on: Next prefetches it and navigates client-side, so a link that
 * belongs to the *other* host gets fetched from this one, 308'd by the proxy
 * and then refused by the browser — "Redirect is not allowed for a preflight
 * request" — which is a console error per crossing link and a navigation
 * that never happens.
 *
 * Absolute URLs fix it at the source: Next renders a plain anchor for an
 * external origin, so there is no prefetch and no client-side navigation,
 * just a real page load that lands on the right host with the right cookie.
 *
 * Both values are empty in development, which keeps localhost on one origin
 * and every link relative. They are inlined at build time, so the server and
 * the client agree and hydration cannot mismatch.
 */
export const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";
export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "";

/** A path on the app host — dashboard, login, settings. */
export function appHref(path: string): string {
  return `${APP_ORIGIN}${path}`;
}

/** A path on the public site — home, pricing, guides. */
export function siteHref(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

/**
 * Where a "Subscribe to <plan>" click goes. A signed-in visitor goes straight
 * to billing; the signup page would bounce them to the dashboard
 * (RedirectIfAuthenticated) and drop the plan. Everyone else goes through
 * signup, whose ?next= survives both the email round trip and the Google
 * handoff (see post-verify-next.ts), and ?plan= makes billing single the card
 * out.
 */
export function subscribeHref(tier: Tier, signedIn: boolean): string {
  const billing = `/settings/billing?plan=${tier}`;
  return appHref(signedIn ? billing : `/signup?next=${encodeURIComponent(billing)}`);
}
