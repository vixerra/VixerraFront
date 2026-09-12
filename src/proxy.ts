import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route protection used to happen here via a session-cookie presence check,
// but that only works when the frontend and API are same-site. Now that the
// frontend calls the Supabase Edge Function directly (a different
// registrable domain), the session cookie is scoped to *.supabase.co and is
// never sent on requests to this app's own origin — this proxy structurally
// cannot see it. Route protection now lives client-side instead (see
// AppShell's useMe()-based guard and RedirectIfAuthenticated), since only
// the browser (holding the cross-site cookie) and the Edge API can tell
// whether a session is valid.
//
// What it does do is split one deployment across two hosts: the public site
// stays on the apex, everything that needs a session moves to
// app.vixlens.com. One Next app, two domains — not two deployments. Vercel
// serves the same build on both, and the rules below decide which host owns
// a path, so a link landing on the wrong one is corrected with a 308 rather
// than rendering the same page under two hostnames — duplicate content to a
// crawler, and two places to be logged in to a user.
//
// The session needs nothing here either: that same cross-site cookie follows
// the API, not this app's hostname. What DOES need updating alongside this
// is the API's ALLOWED_ORIGINS secret (with the app host first, since
// ALLOWED_ORIGINS[0] is what password-reset and invite emails link to) and
// APP_PUBLIC_URL, the OAuth redirect_uri base.
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
  // /api is deliberately exempt. The social OAuth callback lands on
  // /api/social/callback/[platform] carrying the provider's query string,
  // and a cross-host redirect there is one more thing that can drop it.
  // Whichever host the provider is registered against serves it directly.
  matcher: [
    "/((?!api|_next/static|_next/image|media|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml).*)",
  ],
};
