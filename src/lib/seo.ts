// One source of truth for the site's public origin and the metadata every
// indexable page repeats. Canonical URLs, sitemap entries, Open Graph images
// and JSON-LD `@id`s all have to agree on one absolute origin — a mismatch
// between them is the classic way a site ends up with two indexed copies of
// itself (www vs apex, http vs https).
//
// NEXT_PUBLIC_SITE_URL exists so preview deploys can canonicalise to
// themselves instead of pointing every branch at production. It is read at
// build time, so it must be set in the environment the site is built in.

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vixerra.com";

/** Absolute origin, never with a trailing slash. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, "");

export const SITE_NAME = "Vixerra";

export const SITE_DESCRIPTION =
  "Generate cinematic video and imagery from text, images, or audio in seconds. Vixerra is an AI creative studio for teams that ship fast.";

/** Default social card. There is no bespoke OG image yet, so this reuses a
 *  real generated still from public/media rather than a placeholder. */
export const DEFAULT_OG_IMAGE = "/media/images/gpt-image-11.webp";

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Open Graph for one page, with the site-wide bits filled in.
 *
 * Next.js *replaces* the `openGraph` object rather than merging it, so a page
 * that sets its own title and url silently drops the root layout's siteName
 * and image — which is how a social card ends up with no picture. Building it
 * through here keeps those defaults attached.
 */
export function openGraph({
  title,
  description,
  path,
  type = "website",
  images,
  publishedTime,
  modifiedTime,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  images?: string[];
  publishedTime?: string;
  modifiedTime?: string;
}) {
  return {
    type,
    siteName: SITE_NAME,
    title: `${title} · ${SITE_NAME}`,
    description,
    url: absoluteUrl(path),
    images: images ?? [DEFAULT_OG_IMAGE],
    ...(publishedTime ? { publishedTime } : {}),
    ...(modifiedTime ? { modifiedTime } : {}),
  } as const;
}

/** Trims and collapses copy down to something a meta description can hold
 *  without Google truncating mid-word. */
export function metaDescription(text: string, max = 158) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
