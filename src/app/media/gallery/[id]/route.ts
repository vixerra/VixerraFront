import { fetchPublicGeneration, isVideoGeneration } from "@/lib/public-content";

/**
 * A stable, cacheable URL for a shared generation's still image:
 * /media/gallery/<id> (the poster or the image itself), or
 * /media/gallery/<id>?v=full (an image result at full size).
 *
 * The public feed hands out R2 pre-signed URLs that expire after six hours
 * and change on every response. Used as og:image or an <img src> in crawled
 * HTML, they broke social previews and image search a few hours after each
 * crawl. This URL never changes: each request looks the item up in the feed
 * (itself cached for an hour, well inside the signature's lifetime) and
 * streams the bytes from a freshly signed link.
 *
 * Only shared, completed generations resolve — fetchPublicGeneration reads
 * the public feed, nothing else — so it can't be pointed at private media.
 * Videos are not served here: <video> needs range requests and keeps its
 * signed src.
 */

const EDGE_API_URL = process.env.NEXT_PUBLIC_EDGE_API_URL ?? "";

/** Same allowlist as the studio media proxy: our bucket, or the API's own
 *  upload route for rows written before results moved into the bucket. */
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await fetchPublicGeneration(id);
  if (!item) return new Response("Not found", { status: 404 });

  const full = new URL(request.url).searchParams.get("v") === "full";
  const isVideo = isVideoGeneration(item);
  // A video's still is its poster frame; an image is its own still, with the
  // thumbnail preferred unless the full size is asked for.
  const source = isVideo
    ? item.thumbnailUrl
    : full
      ? (item.resultUrl ?? item.thumbnailUrl)
      : (item.thumbnailUrl ?? item.resultUrl);
  if (!source) return new Response("No still for this generation", { status: 404 });

  let target: URL;
  try {
    target = new URL(source);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!isAllowed(target)) return new Response("Not found", { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(target, { cache: "no-store" });
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }
  if (!upstream.ok) return new Response("Upstream error", { status: 502 });

  const headers = new Headers();
  for (const header of ["content-type", "content-length"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  // A shared generation's still doesn't change, so the URL is safe to
  // cache. The edge copy is kept to an hour so an item that is unshared or
  // taken down by moderation stops being served soon after; revalidation
  // happens in the background, so visitors rarely wait on it.
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");

  return new Response(upstream.body, { status: 200, headers });
}
