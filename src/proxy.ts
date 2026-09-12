import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
const APP_HOST = "app.vixlens.com";
const SITE_HOST = "vixlens.com";

/** Prefix match: the path itself, or anything under it. */
const APP_PREFIXES = [
  "/dashboard",
  "/collections",
  "/my-gallery",
  "/presets",
  "/settings",
  "/studio",
  "/editor",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/admin",
  "/auth/callback",
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

export function proxy(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase();

  // Only the production hostnames are split. localhost and *.vercel.app
  // preview deploys keep serving the whole site from one origin, so
  // `npm run dev` and a preview build still behave like they always did.
  if (host !== APP_HOST && host !== SITE_HOST && host !== `www.${SITE_HOST}`) {
    return NextResponse.next();
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
  if (req.headers.get("rsc") === "1") return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  const belongsToApp = isAppPath(pathname);

  if (belongsToApp && host !== APP_HOST) {
    return NextResponse.redirect(`https://${APP_HOST}${pathname}${search}`, 308);
  }
  if (!belongsToApp && host === APP_HOST) {
    return NextResponse.redirect(`https://${SITE_HOST}${pathname}${search}`, 308);
  }

  const res = NextResponse.next();
  // The app host must never be indexed: it serves the same build as the
  // canonical site, and nothing behind a login belongs in a search result.
  if (host === APP_HOST) res.headers.set("X-Robots-Tag", "noindex, nofollow");
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
  matcher: [
    "/((?!api|edge-api|_next|_vercel|media|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml).*)",
  ],
};
