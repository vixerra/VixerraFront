// Server-side reads of the two public catalogues the marketing site needs in
// its HTML: the community feed and the preset catalogue.
//
// The browser talks to the Edge Function through the same-origin "/edge-api"
// rewrite (see api-client.ts) so its session cookie stays first-party. None
// of that applies here: this runs on the server, has no cookie to protect,
// and a relative URL has no origin to resolve against — so it calls the Edge
// Function's absolute URL directly.
//
// Both endpoints are public by definition — a generation only appears in the
// feed once its owner has shared it, and the preset catalogue is deliberately
// unauthenticated — so no session is attached; the Supabase gateway still
// wants its publishable apikey header.
//
// Server-only by construction rather than by the `server-only` package, which
// isn't a dependency here: every caller is a server component or a metadata
// route, and nothing in this module belongs in a client bundle — from the
// browser the absolute URL below is a cross-site call whose session cookie
// WebKit drops, which is the exact bug the /edge-api rewrite exists to avoid.

import type { Preset } from "@/lib/viral-presets";

const EDGE_API_URL = process.env.NEXT_PUBLIC_EDGE_API_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type PublicGeneration = {
  id: string;
  type: string;
  model: string;
  prompt: string;
  status: string;
  resultUrl: string | null;
  thumbnailUrl: string | null;
  fromPreset?: boolean;
  negativePrompt?: string | null;
  seed?: number | null;
  parameters?: Record<string, unknown> | null;
  likeCount?: number;
  author?: { name: string; avatarUrl: string | null } | null;
  createdAt?: string;
};

/**
 * The whole public feed.
 *
 * `resultUrl` comes back as a pre-signed R2 link that expires in six hours,
 * which is why callers must not cache a rendered page for longer than that —
 * see the `revalidate` on the gallery routes. Returns an empty list rather
 * than throwing: a marketing page that can't reach the API should still
 * render its own copy instead of 500ing.
 */
export async function fetchPublicGenerations(
  revalidateSeconds = 3600,
): Promise<PublicGeneration[]> {
  if (!EDGE_API_URL) return [];
  try {
    const res = await fetch(`${EDGE_API_URL}/generations/public`, {
      headers: SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : undefined,
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: PublicGeneration[] };
    return (data.items ?? []).filter((item) => item.status === "completed");
  } catch {
    return [];
  }
}

export async function fetchPublicGeneration(
  id: string,
  revalidateSeconds = 3600,
): Promise<PublicGeneration | undefined> {
  const items = await fetchPublicGenerations(revalidateSeconds);
  return items.find((item) => item.id === id);
}

/**
 * The published preset catalogue, for the server-rendered half of /prompts.
 *
 * GET /api/presets is deliberately unauthenticated (see the note on the
 * /prompts page), so this needs no session either. Only the text fields are
 * used downstream — `previewUrl` is signed and short-lived, and the clip is
 * the interactive gallery's job.
 */
export async function fetchPublicPresets(
  revalidateSeconds = 3600,
): Promise<Preset[]> {
  if (!EDGE_API_URL) return [];
  try {
    const res = await fetch(`${EDGE_API_URL}/presets`, {
      headers: SUPABASE_ANON_KEY ? { apikey: SUPABASE_ANON_KEY } : undefined,
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { presets?: Preset[] };
    return data.presets ?? [];
  } catch {
    return [];
  }
}

export function isVideoGeneration(item: PublicGeneration) {
  return item.type !== "text-to-image";
}

/**
 * Whether this generation's prompt can stand in as prose — in a title, a
 * heading, or a meta description.
 *
 * False for a preset (its prompt is ours, not the sharer's, and is never
 * published) and for a prompt pasted as a JSON brief, which several people do:
 * that reads as machine noise anywhere a sentence is expected. The detail page
 * still shows such a prompt verbatim in its own Prompt block — it is what the
 * person actually wrote — it just isn't used as the page's name.
 */
export function hasDisplayablePrompt(item: PublicGeneration) {
  if (item.fromPreset) return false;
  const clean = item.prompt.replace(/\s+/g, " ").trim();
  return clean.length > 0 && !/^[{[]/.test(clean);
}

/**
 * What a shared generation is called in a <title>, an <h1>, a breadcrumb or an
 * alt attribute.
 *
 * Normally the prompt, trimmed to `max`. Two cases can't use it:
 *
 *  - A preset's prompt is deliberately never published (see itemLabel in
 *    generation-card.tsx).
 *  - Some people paste a JSON brief as the prompt. Truncated to 70 characters
 *    that renders as `{ "video_type": "short_product_promotion", "duration":…`
 *    — machine noise as a page title, and useless as a heading.
 *
 * Both fall back to naming the generation after its model, which needs the
 * caller to pass the label since this module doesn't know the catalog.
 */
export function generationTitle(
  item: PublicGeneration,
  { max = 70, modelLabel }: { max?: number; modelLabel?: string } = {},
) {
  const kind = isVideoGeneration(item) ? "AI video" : "AI image";
  const clean = item.prompt.replace(/\s+/g, " ").trim();

  if (!hasDisplayablePrompt(item)) {
    return modelLabel ? `${kind} made with ${modelLabel}` : kind;
  }

  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}
