import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizePromoParam, PROMO_COOKIE, PROMO_COOKIE_MAX_AGE } from "@/lib/promo-link";

// Route protection does not happen here, and the reason has changed since
// that was decided. It used to be a session-cookie presence check, which
// broke when the frontend started calling the Edge Function on its own
// *.supabase.co domain: the cookie was cross-site and never reached this
// app's origin. It reaches it again today — the browser talks to the Edge
// Function through the same-origin /edge-api rewrite (next.config.ts), which
// is what makes the cookie first-party at all, WebKit having blocked the
// third-party one. So this proxy could now see the cookie, but presence is
// not validity: only the Edge API can say whether a session is live. The
// guard therefore stays client-side (AppShell's useMe() and
// RedirectIfAuthenticated).
//
// What it does do is split one deployment across two hosts: the public site
// stays on the apex, everything that needs a session moves to
// app.vixlens.com. One Next app, two domains — not two deployments. Vercel
// serves the same build on both, and the rules below decide which host owns
// a path, so a link landing on the wrong one is corrected with a 308 rather
// than rendering the same page under two hostnames — duplicate content to a
// crawler, and two places to be logged in to a user.
//
// The session does need care, for the same reason as above: being
// first-party, the cookie is host-only, so one obtained on the app host is
// not sent to the apex — where the shared header still asks /auth/me who you
// are, and would show an app user as logged out. The API carries a
// SESSION_COOKIE_DOMAIN secret for exactly that; set it to ".vixlens.com"
// and both hosts share one session. Two more secrets need the new origin:
// ALLOWED_ORIGINS (app host FIRST, since ALLOWED_ORIGINS[0] is what
// password-reset and invite emails link to) and APP_PUBLIC_URL, the OAuth
// redirect_uri base.
//
// The staff console has a third host, admins.vixlens.com, under the same
// rules. It needs none of the secrets above: the admin cookie is host-only
// by design (lib/admin-session.ts in the API), so a session there never
// leaks to the customer-facing hosts, and it goes through /edge-api like
// everything else, so the API never sees it as a cross-origin caller.
const APP_HOST = "app.vixlens.com";
const ADMIN_HOST = "admins.vixlens.com";
const SITE_HOST = "vixlens.com";
// The API host serves the MCP endpoint and the OAuth server behind it (for
// claude.ai connectors), which beforeFiles rewrites in next.config.ts send to
// the Edge Function. Kept out of KNOWN_HOSTS: it has no pages to redirect
// between and no promo cookie.
const API_HOST = "api.vixlens.com";
const API_HOST_PATHS = new Set([
  "/mcp",
  "/oauth/register",
  "/oauth/token",
  "/oauth/revoke",
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-authorization-server/mcp",
]);
const KNOWN_HOSTS = new Set([SITE_HOST, `www.${SITE_HOST}`, APP_HOST, ADMIN_HOST]);

/** Prefix match: the path itself, or anything under it. */
const APP_PREFIXES = [
  "/dashboard",
  "/collections",
  "/my-gallery",
  "/presets",
  "/influencer",
  "/genjutsu",
  "/settings",
  "/studio",
  "/editor",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/auth/callback",
  // The OAuth consent screen (claude.ai connectors). The API advertises it on
  // the app host, where the session cookie lives.
  "/oauth",
];

/**
 * /generate belongs to both sides. The composer is `/generate`,
 * `/generate/image` and `/generate/image-to-video`; every other child is a
 * per-model SEO landing page under (marketing). A prefix rule would move
 * those landing pages onto the app host and out of the index, so the three
 * app pages are matched exactly instead.
 */
const APP_EXACT = new Set(["/generate", "/generate/image", "/generate/image-to-video"]);

function isAppPath(pathname: string): boolean {
  if (APP_EXACT.has(pathname)) return true;
  return APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** The host that owns a path. Paths stay /admin/* on the admin host — every
 *  link and router.push in the panel already uses that prefix. */
function ownerHost(pathname: string): string {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return ADMIN_HOST;
  if (isAppPath(pathname)) return APP_HOST;
  return SITE_HOST;
}

/** The /edge-api calls that can fire CompleteRegistration (routes/auth.ts in
 *  the API). Listed again in config.matcher below. */
const REGISTRATION_ENDPOINTS = ["/edge-api/auth/register", "/edge-api/auth/oauth/session", "/edge-api/auth/verify-email"];

/** Vercel geo header → the name the API's geoFromRequest (lib/meta-capi.ts)
 *  reads. The API can't geolocate the caller itself: through the /edge-api
 *  rewrite, Supabase only sees Vercel's server, so its cf-* geo is Vercel's
 *  datacenter. Re-sent under our own names, rather than relied on to survive
 *  the external rewrite, and always overwritten so a client can't set them. */
const GEO_HEADERS: Record<string, string> = {
  "x-vercel-ip-city": "x-client-geo-city",
  "x-vercel-ip-country-region": "x-client-geo-region",
  "x-vercel-ip-postal-code": "x-client-geo-postal-code",
  "x-vercel-ip-country": "x-client-geo-country",
};

function withClientGeo(req: NextRequest) {
  const headers = new Headers(req.headers);
  for (const [from, to] of Object.entries(GEO_HEADERS)) {
    const value = req.headers.get(from);
    if (value) headers.set(to, value);
    else headers.delete(to);
  }
  return NextResponse.next({ request: { headers } });
}

/** The API's session cookie (lib/session.ts there). */
const SESSION_COOKIE = "session";

/**
 * A partner link (?promo=CODE on any page) is remembered for the pricing page
 * and billing to apply — see src/lib/promo-link.ts. On the production hosts
 * it goes on the parent domain, so a code picked up on the apex survives the
 * hop to the app host for signup and billing.
 */
function rememberPromo(req: NextRequest, res: NextResponse, host: string | undefined): NextResponse {
  const code = normalizePromoParam(req.nextUrl.searchParams.get("promo"));
  if (!code) return res;
  res.cookies.set(PROMO_COOKIE, code, {
    path: "/",
    maxAge: PROMO_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    ...(host && KNOWN_HOSTS.has(host) ? { domain: `.${SITE_HOST}` } : {}),
  });
  return res;
}

export function proxy(req: NextRequest) {
  const res = route(req);
  if (req.nextUrl.pathname.startsWith("/edge-api")) return res;
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase();
  // The API host is machine traffic; /mcp on the site host is the MCP page.
  if (host === API_HOST) return res;
  return rememberPromo(req, res, host);
}

function route(req: NextRequest) {
  // Same-origin API calls, served on every host — see the matcher note.
  if (REGISTRATION_ENDPOINTS.includes(req.nextUrl.pathname)) return withClientGeo(req);

  // Every signed-out page view asks the header's "who am I". With no session
  // cookie at all the API can only answer 401, which the browser logs as a
  // console error on every marketing page (and PageSpeed counts against Best
  // Practices). Answered here instead, as a plain "nobody" that useMe treats
  // exactly like that 401. A cookie that is present still goes to the API,
  // which alone can say whether it's valid.
  // With a cookie it must pass straight through: falling into the host rules
  // below would 308 it from the app host to the apex like a marketing page,
  // which fails the fetch and bounced every signed-in user back to /login.
  if (req.nextUrl.pathname === "/edge-api/auth/me") {
    if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();
    return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase();

  // The MCP and OAuth paths pass on to their rewrites; anything else would
  // render the marketing site under the API's name, so it 404s the same way
  // /admin does elsewhere.
  if (host === API_HOST) {
    if (API_HOST_PATHS.has(req.nextUrl.pathname)) return NextResponse.next();
    return NextResponse.rewrite(new URL("/_api-not-found", req.url));
  }

  // Only the production hostnames are split. localhost and *.vercel.app
  // preview deploys keep serving the whole site from one origin, so
  // `npm run dev` and a preview build still behave like they always did.
  if (!host || !KNOWN_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const { pathname, search } = req.nextUrl;
  const owner = ownerHost(pathname);

  // The panel only exists for someone who typed the admin host. Everywhere
  // else /admin is a plain 404 — never a redirect, which would advertise
  // where it lives. This runs before the RSC exemption below, which would
  // otherwise render the panel on any host. The rewrite target is a
  // private-folder path (leading "_"), which no route can ever match.
  if (owner === ADMIN_HOST && host !== ADMIN_HOST) {
    return NextResponse.rewrite(new URL("/_admin-not-found", req.url));
  }

  // Next fetches the same URL with an `RSC: 1` header to prefetch a link and
  // to navigate client-side. Those are same-origin fetches from whichever
  // host the page is on, so a 308 to the other host turns them into a
  // cross-origin request the browser refuses outright — "Redirect is not
  // allowed for a preflight request", once per crossing link. Serving them
  // costs nothing: the real navigation is a document request with no RSC
  // header and still gets redirected. Crossing links are absolute anyway
  // (src/lib/hosts.ts), which stops the prefetch from happening at all —
  // this is the net under that.
  if (req.headers.has("rsc") || req.headers.has("next-router-prefetch")) {
    return NextResponse.next();
  }

  // The admin host has nothing of its own at the root, so the bare domain
  // opens the panel instead of bouncing to the marketing home page.
  if (host === ADMIN_HOST && pathname === "/") {
    return NextResponse.redirect(`https://${ADMIN_HOST}/admin${search}`, 308);
  }

  // www keeps serving the public site as it always has. owner is never
  // ADMIN_HOST here unless we are already on it (see the 404 above).
  const onOwner = host === owner || (owner === SITE_HOST && host === `www.${SITE_HOST}`);
  if (!onOwner) {
    return NextResponse.redirect(`https://${owner}${pathname}${search}`, 308);
  }

  const res = NextResponse.next();
  // The app and admin hosts must never be indexed: they serve the same build
  // as the canonical site, and nothing behind a login belongs in a search result.
  if (host === APP_HOST || host === ADMIN_HOST) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Three exemptions, and /edge-api is the one that matters most: it is the
  // same-origin rewrite to the Edge Function (next.config.ts), so it has to
  // be served by whichever host the browser is already on. Redirecting it
  // cross-host fails outright — "Redirect is not allowed for a preflight
  // request" — and takes every API call on the app host with it.
  //
  // /api is exempt because the social OAuth callback lands on
  // /api/social/callback/[platform] carrying the provider's query string,
  // and a cross-host redirect there is one more thing that can drop it.
  // _next and _vercel are framework-internal and never user-visible routes.
  //
  // The registration endpoints are the one way back in, and only to have
  // the user's geo attached (withClientGeo) — never host-redirected. So is
  // /edge-api/auth/me, answered here when there's no session cookie.
  matcher: [
    "/((?!api|edge-api|_next|_vercel|media|favicon.ico|icon.svg|icon1.png|apple-icon.png|robots.txt|sitemap.xml).*)",
    "/edge-api/auth/register",
    "/edge-api/auth/oauth/session",
    "/edge-api/auth/verify-email",
    "/edge-api/auth/me",
  ],
};
