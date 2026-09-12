import { NextResponse, type NextRequest } from "next/server";

/**
 * Where TikTok / Google / Meta send the browser back after consent.
 *
 * This lives in the Next.js app rather than the Edge Function for one
 * unavoidable reason: Supabase's API gateway requires an `apikey` header on
 * every request to a function (see supabase/functions/api/index.ts), and an
 * OAuth provider's redirect is a plain browser navigation that can't send
 * headers. Smuggling the key in the query string doesn't work either —
 * Google rejects redirect URIs that carry query parameters.
 *
 * So the provider lands here, and this forwards the code server-side with
 * the header attached. The user's identity comes from the signed `state`
 * token, not from a cookie, which is what makes that forward safe.
 */
const EDGE_API_URL = process.env.NEXT_PUBLIC_EDGE_API_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const PLATFORMS = new Set(["tiktok", "youtube", "facebook", "instagram"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  // Default target. The success path replaces the origin with the one the
  // creator actually started from — see returnOrigin below.
  const settingsUrl = new URL("/settings/social", request.nextUrl.origin);

  if (!PLATFORMS.has(platform)) {
    settingsUrl.searchParams.set("error", "Unknown platform.");
    return NextResponse.redirect(settingsUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  // Providers report a refusal here rather than by failing the exchange —
  // "the user pressed Cancel" is a normal outcome, not an error to log.
  const denied = request.nextUrl.searchParams.get("error_description")
    ?? request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state");

  if (denied) {
    settingsUrl.searchParams.set("error", denied);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set("error", "That connection was cancelled or incomplete.");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const res = await fetch(`${EDGE_API_URL}/social/callback/${platform}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : {}),
      },
      body: JSON.stringify({ code, state }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      account?: { displayName?: string };
      returnOrigin?: string | null;
    };

    if (!res.ok) {
      settingsUrl.searchParams.set("error", json.error ?? "Connecting that account failed.");
      return NextResponse.redirect(settingsUrl);
    }

    settingsUrl.searchParams.set("connected", json.account?.displayName ?? platform);

    // Google redirected the browser to the host APP_PUBLIC_URL names, which
    // is not necessarily the host the creator was browsing — and the session
    // cookie belongs to exactly one host. Land them back where they started
    // so they arrive at Settings signed in, rather than at /login. The value
    // comes out of the signed state token and has already been checked
    // against ALLOWED_ORIGINS server-side, so it can't be an open redirect.
    if (json.returnOrigin) {
      const target = new URL(settingsUrl.pathname + settingsUrl.search, json.returnOrigin);
      return NextResponse.redirect(target);
    }
  } catch {
    settingsUrl.searchParams.set("error", "Couldn't reach the server to finish connecting.");
  }

  return NextResponse.redirect(settingsUrl);
}
