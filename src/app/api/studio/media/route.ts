import { type NextRequest } from "next/server";

/**
 * Streams a generation's stored media back through this origin.
 *
 * The Editing Studio has to read the actual PIXELS of a clip — it draws
 * every frame onto a canvas and encodes the result. Anything drawn from a
 * cross-origin source taints the canvas, and from that moment
 * `getImageData`, `captureStream` and `new VideoFrame(canvas)` all throw a
 * SecurityError. The usual fix, `crossOrigin="anonymous"`, needs the origin
 * serving the bytes to answer with CORS headers — and R2's pre-signed URLs
 * deliberately carry none (see the note on downloadGenerationResult in
 * src/lib/download.ts, which ran into the same wall from the other side).
 *
 * So the bytes come back through here instead, where they are same-origin
 * and the canvas stays clean. Nothing is stored: this is a pipe.
 *
 * ## Why this is not an open proxy
 *
 * The `url` it accepts must already be a valid pre-signed URL on our own
 * bucket (or the API's own upload route). Holding one of those is already
 * enough to fetch the object directly — this hands back nothing the caller
 * could not have had, it only changes which origin serves it. The host
 * allowlist below is what keeps it from being turned into a general-purpose
 * SSRF gadget against anything else on the network.
 */

const EDGE_API_URL = process.env.NEXT_PUBLIC_EDGE_API_URL ?? "";

/** R2 pre-signed playback URLs, plus the API's own upload proxy for rows
 *  written before results moved into the bucket. */
function isAllowed(target: URL): boolean {
  if (target.protocol !== "https:") return false;
  if (target.hostname.endsWith(".r2.cloudflarestorage.com")) return true;
  if (EDGE_API_URL) {
    try {
      if (target.hostname === new URL(EDGE_API_URL).hostname) return true;
    } catch {
      // A malformed env var must not widen the allowlist.
    }
  }
  return false;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return new Response("Missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (!isAllowed(target)) return new Response("Host not allowed", { status: 403 });

  // Range is forwarded so a <video> pointed straight at this route can still
  // seek — the studio downloads whole clips up front, but the preview player
  // and the timeline thumbnails do not.
  const range = request.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: range ? { range } : undefined,
      // The signature in the URL is the only credential involved; sending
      // the user's cookies to the bucket would be both useless and wrong.
      cache: "no-store",
    });
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Upstream error", { status: 502 });
  }

  const headers = new Headers();
  for (const header of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  // A signed URL expires; caching its bytes under a URL that outlives the
  // signature would serve a 403 body from cache long after the real object
  // is still perfectly readable.
  headers.set("Cache-Control", "private, no-store");

  return new Response(upstream.body, { status: upstream.status, headers });
}
