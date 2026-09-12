// DUPLIQUÉ dans aiVideo-backend/supabase/functions/api/lib/credit-estimate.ts
// — garder synchronisé.
// Pure cost-estimation logic — imported client-side too (e.g. for a live
// "estimated cost" readout in the generate forms), no network round-trip.

import {
  CREDIT_VALUE_USD,
  SEEDANCE_MODEL_ID,
  SEEDANCE2_MODEL_ID,
  SEEDANCE_DURATION_MIN,
  SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS,
  type GenerationType,
  type VideoResolution,
} from "@/lib/constants";

// ── The pricing rule, stated once ────────────────────────────────────────
// Everything below is a table of *real provider cost in USD*. Credit prices
// are derived from it, never hand-written, so the margin can be retuned in
// one place instead of by re-multiplying every model.
//
// A credit SELLS for CREDIT_VALUE_USD ($0.01 — see constants.ts, where
// every plan and pack is priced at that rate). TARGET_GROSS_MARGIN is the
// cut of that we keep, so a credit may only buy COST_USD_PER_CREDIT =
// $0.005 of provider compute on video. Images use their own, steeper
// IMAGE_GROSS_MARGIN (65%, so IMAGE_COST_USD_PER_CREDIT = $0.0035):
//
//   credits = round(seconds × usdPerSecond / COST_USD_PER_CREDIT)
//
// Before 2026-08-30 credits were sold and spent at par ($0.01 of compute
// per $0.01 credit) and the margin came entirely from tiers granting fewer
// credits than their price would buy. That stopped working once the plans
// were repriced to a flat 1000/2500/5000 credits — at par those grant more
// compute than they cost — so the markup now lives on the generation side,
// where it scales with actual usage instead of with the grant.
const TARGET_GROSS_MARGIN = 0.5;
const COST_USD_PER_CREDIT = CREDIT_VALUE_USD * (1 - TARGET_GROSS_MARGIN);

// Images carry a steeper margin than video (2026-08-30). A single image is
// cheap enough in absolute terms that the whole move is $0.02 -> $0.03, which
// barely registers next to a multi-dollar clip, so the extra 15 points are
// taken here instead of on video where the same percentage would cost a user
// real money per generation.
const IMAGE_GROSS_MARGIN = 0.65;
const IMAGE_COST_USD_PER_CREDIT = CREDIT_VALUE_USD * (1 - IMAGE_GROSS_MARGIN);

function creditsFor(seconds: number, usdPerSecond: number): number {
  return Math.round((seconds * usdPerSecond) / COST_USD_PER_CREDIT);
}

// Rounds UP where creditsFor rounds to nearest, because a credit is too coarse
// to land on 65% exactly: a quality image is 14.29 credits, and rounding it
// down to 14 would sell at 64.3%, under the target. Ceil keeps every image at
// or above IMAGE_GROSS_MARGIN - both buckets land on 66.7% (fast: 3 credits,
// quality: 15).
function imageCreditsFor(costUsd: number): number {
  return Math.ceil(costUsd / IMAGE_COST_USD_PER_CREDIT);
}

// Real provider cost per second of output, keyed by resolution since the
// tiers genuinely differ per model (Seedance 2.5 offers 480p/720p, not
// 720p/1080p).
//
// bytedance/seedance-2.5 and bytedance/seedance-2.0 come straight from the
// "Plan Tarifaire Créateur" pricing artifact's measured per-second Seedance
// cost table (2026-08-22). `withReferenceVideo` (2.0 only) applies when a
// reference video/image is attached — the model genuinely costs more in
// that mode.
//
// Every other entry has no published per-second cost to draw on, so it is
// still an *estimate*: the same relative multiplier off bytedance/
// seedance-2.0's text→video cost that each model has always carried,
// documented per-entry below.
//
// `minSeconds` is the shortest clip the model accepts — the floor cost is
// that many seconds at the model's cheapest resolution, so a request can
// never be quoted below what the provider will actually bill us for.
const VIDEO_COST_USD: Record<
  string,
  {
    perSecond: Record<string, number>;
    withReferenceVideo?: Record<string, number>;
    /** Rates when the model is asked for a soundtrack. Kling sells audio as
     *  a separate line — 2.6 doubles, 3.0 adds 40-50% — so quoting the silent
     *  rate for a run with sound would sell it below cost. Absent means audio
     *  changes nothing, which is true of every Cloudflare entry here. */
    withAudio?: Record<string, number>;
    minSeconds: number;
    /** Floor for the withReferenceVideo table, when it differs. */
    minSecondsWithReferenceVideo?: number;
  }
> = {
  // withReferenceVideo is derived, not measured: the pricing artifact only
  // measured 2.0's two tables, and 2.0's reference-video mode costs a flat
  // ~2.46x its text->video rate across every resolution (0.07->0.172,
  // 0.15->0.372, 0.37->0.914, 0.78->1.866). The same multiplier is applied
  // to 2.5's own measured base rates here — same convention as every other
  // estimated entry below. It matters because 2.5 accepts up to ten
  // reference videos and a 30s output: quoting that mode off the plain table
  // would under-bill it by more than half.
  "bytedance/seedance-2.5": {
    perSecond: { "480p": 0.103, "720p": 0.231 },
    withReferenceVideo: { "480p": 0.253, "720p": 0.573 },
    minSeconds: 4,
    minSecondsWithReferenceVideo: 4,
  },
  "bytedance/seedance-2.0": {
    perSecond: { "480p": 0.07, "720p": 0.15, "1080p": 0.37, "4k": 0.78 },
    withReferenceVideo: { "480p": 0.172, "720p": 0.372, "1080p": 0.914, "4k": 1.866 },
    minSeconds: 4,
    minSecondsWithReferenceVideo: 4,
  },
  // 0.75x (480p/720p) / 0.8x (1080p) of Seedance 2.0.
  "bytedance/seedance-2.0-mini": {
    perSecond: { "480p": 0.0525, "720p": 0.1125, "1080p": 0.296 },
    minSeconds: 3,
  },
  // 1.33x (720p) / 1.3x (1080p) of Seedance 2.0.
  "black-forest-labs/flux-3-video": {
    perSecond: { "720p": 0.1995, "1080p": 0.481 },
    minSeconds: 3,
  },
  // 1.25x (480p) / 1.17x (720p) of Seedance 2.0.
  "xai/grok-imagine-video": {
    perSecond: { "480p": 0.0875, "720p": 0.1755 },
    minSeconds: 3,
  },
  // 1.5x (both) of Seedance 2.0.
  "xai/grok-imagine-video-1.5-preview": {
    perSecond: { "480p": 0.105, "720p": 0.225 },
    minSeconds: 3,
  },
  // 0.83x (720p) / 0.8x (1080p) of Seedance 2.0.
  // ---------- Kling, on kie.ai ----------
  // Read off kie.ai's own pricing table (kie.ai/fr/pricing, 2026-09-12),
  // which quotes Kling per second and sells the soundtrack separately —
  // hence withAudio. 2.6 exposes no resolution at all, so its table carries
  // the single rate under "default": rates[resolution] falls through to the
  // highest entry when the key is missing, which is that same number.
  "kling/3.0": {
    perSecond: { "720p": 0.07, "1080p": 0.09, "4k": 0.335 },
    withAudio: { "720p": 0.1, "1080p": 0.135, "4k": 0.335 },
    minSeconds: 3,
  },
  "kling/3.0-omni": {
    perSecond: { "720p": 0.07, "1080p": 0.09, "4k": 0.335 },
    withAudio: { "720p": 0.1, "1080p": 0.135, "4k": 0.335 },
    minSeconds: 3,
  },
  "kling/3.0-turbo": {
    perSecond: { "720p": 0.09, "1080p": 0.1125 },
    minSeconds: 3,
  },
  // $0.275 for a silent 5s clip, $0.55 with sound — exactly double.
  "kling/2.6": {
    perSecond: { default: 0.055 },
    withAudio: { default: 0.11 },
    minSeconds: 5,
  },
  "kling/2.6-image": {
    perSecond: { default: 0.055 },
    withAudio: { default: 0.11 },
    minSeconds: 5,
  },
  // Pro tier: $0.25 for 5s, $0.50 for 10s. The Standard and Master tiers
  // kie.ai also lists are different models, not options on this one.
  "kling/2.1-pro": {
    perSecond: { default: 0.05 },
    minSeconds: 5,
  },
  "alibaba/hh1.1-i2v": {
    perSecond: { "720p": 0.1245, "1080p": 0.296 },
    minSeconds: 3,
  },
  "alibaba/wan-2.7-i2v": {
    perSecond: { "720p": 0.1245, "1080p": 0.296 },
    minSeconds: 3,
  },
  // Google's flagship video model, native audio — 1.67x (720p) / 1.6x
  // (1080p) of Seedance 2.0, the priciest tier here, reflecting that
  // positioning.
  "google/veo-3.1": {
    perSecond: { "720p": 0.2505, "1080p": 0.592 },
    minSeconds: 3,
  },
  // 1.17x (720p) / 1.1x (1080p) of Seedance 2.0.
  "google/veo-3.1-fast": {
    perSecond: { "720p": 0.1755, "1080p": 0.407 },
    minSeconds: 3,
  },
  // Vidu Q3 — estimates, no published per-second cost. Pro at 1.33x and
  // Turbo at 0.75x of Seedance 2.0's 720p/1080p cost, with 540p carried
  // down proportionally. Both allow 1s clips.
  "vidu/q3-pro": {
    perSecond: { "540p": 0.093, "720p": 0.2, "1080p": 0.49 },
    minSeconds: 1,
  },
  "vidu/q3-turbo": {
    perSecond: { "540p": 0.0525, "720p": 0.1125, "1080p": 0.2775 },
    minSeconds: 1,
  },
  // Pruna P-Video — no published per-second cost to scale from, so this is
  // parity with Seedance 2.0's 720p/1080p cost as a placeholder until real
  // numbers exist. It allows durations down to 1s, unlike everything else
  // here. NOTE: the tables key on resolution only, so a 48fps clip bills
  // the same as 24fps despite rendering twice the frames.
  "pruna/p-video": {
    perSecond: { "720p": 0.15, "1080p": 0.37 },
    minSeconds: 1,
  },
  // MiniMax Hailuo 2.3 — 1.2x (768p) / 1.08x (1080p) of Seedance 2.0. Its
  // shortest clip is 6s (there is no 3s option).
  "minimax/hailuo-2.3": {
    perSecond: { "768p": 0.18, "1080p": 0.4 },
    minSeconds: 6,
  },
};

// duration=-1 ("automatic") doesn't tell us the real output length ahead of
// time, so cost estimation assumes this many seconds for that case. Only
// Seedance 2.5 supports auto duration — 2.0 always sends a real 4-12s value.
const LIVE_VIDEO_AUTO_DURATION_ESTIMATE = 8;

/**
 * How many seconds of output to price and gate a request on.
 *
 * A real 4-30 value answers itself. -1 has to be assumed, and the right
 * assumption depends on what the request carries: with a timed reference
 * attached, the provider keeps the output "close to the input", and that
 * input may be the full 30s the reference lists allow — so an 8s guess would
 * under-bill a 30s clip by nearly 4x, in the one mode whose per-second rate
 * is also the highest. The ceiling over-quotes a short reference; billing
 * above what the provider charges is the only direction that costs the user
 * rather than us, and it is the reason the composer defaults to an explicit
 * duration and offers Auto rather than the reverse.
 *
 * Exported because the API's tier duration cap gates on the same number it
 * bills on (see aiVideo-backend's generations.ts) — two independent -1
 * assumptions is how a plan limit and a price quietly disagree.
 */
export function effectiveVideoSeconds(
  durationSeconds: number,
  options: { hasTimedReference?: boolean } = {},
): number {
  if (durationSeconds !== -1) return durationSeconds;
  return options.hasTimedReference
    ? SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS
    : LIVE_VIDEO_AUTO_DURATION_ESTIMATE;
}

// Two-bucket image pricing: a "quality" catalog id is priced off a $0.05
// provider cost, every other (fast) model off $0.01 — a judgment call
// mapping this app's actual Cloudflare catalog (cloudflare-models.ts) onto
// the pricing artifact's illustrative Flux-Schnell/Dev/Pro/Imagen/
// Nano-Banana examples, none of which are in this catalog: the ids below
// are the ones whose own label/description says "pro"/flagship/"quality".
// These two buckets are the least-grounded numbers in this file — if a real
// per-image cost ever lands, split them per model like the video table
// above rather than nudging the buckets. Both sell at IMAGE_GROSS_MARGIN
// (65%), not video's 50%: fast = 3 credits ($0.03), quality = 15 ($0.15).
//
// The bucket is the cost at each model's DEFAULT size and quality (see
// IMAGE_REFERENCE_SETTINGS) — the factors below scale it from there, so a
// model left on its defaults prices exactly as it did when this was a flat
// per-model figure.
const QUALITY_IMAGE_MODELS = new Set([
  "recraft/recraftv4-1-pro",
  "bytedance/seedream-5-pro",
  "xai/grok-imagine-image-quality",
  "openai/gpt-image-2",
  "google/nano-banana-pro",
]);
const FAST_IMAGE_COST_USD = 0.01;
const QUALITY_IMAGE_COST_USD = 0.05;

// ── Image size / quality scaling ─────────────────────────────────────────
// Until 2026-08-31 an image cost the same whatever size or quality was
// picked: the composer puts a Resolution/Size/Quality pill directly beside
// the credit cost, and the number never moved — while a 4K render genuinely
// costs the provider several times what a 1K one does. These two factor
// tables put that back.
//
// SIZE scales with the image's LINEAR dimension (the square root of its
// pixel count), not with pixels themselves: 4K has 16x the pixels of 1K and
// no provider in this catalog charges anything close to 16x for it — Nano
// Banana Pro, the one model here with a published 1K/2K/4K price, is flat
// from 1K to 2K and ~1.8x at 4K. Per-pixel would wildly overcharge, flat is
// the bug being fixed, so linear-dimension sits between the two and is one
// rule that applies to every model instead of a special case per provider.
// Keys are the registry's own spellings — ByteDance writes "2K", xAI "2k",
// and neither is interchangeable (see cloudflare-models.ts).
const IMAGE_SIZE_FACTOR: Record<string, number> = {
  "1k": 1,
  "1K": 1,
  "2k": 2,
  "2K": 2,
  "3k": 3,
  "3K": 3,
  "4k": 4,
  "4K": 4,
};

// QUALITY is the same idea for the models that expose an effort dial instead
// of (or alongside) a size. Deliberately a narrower spread than the
// providers' own — OpenAI's low->high on gpt-image-1 is a ~15x swing —
// because this rides on top of an already coarse two-bucket base cost, and
// overstating it would price "high" past what that bucket can justify.
// "auto" hands the choice to the model, so it bills as the middle option
// rather than guessing.
const IMAGE_QUALITY_FACTOR: Record<string, number> = {
  low: 0.6,
  medium: 1,
  high: 1.6,
  auto: 1,
};

// The size/quality each model's bucket price above is quoted at — i.e. its
// `defaultValue` in cloudflare-models.ts. Scaling is always a RATIO against
// these, which is what keeps every model's default-settings price identical
// to the flat figure it had before scaling existed. A model missing here
// either has no size control at all (lucid-origin, nano-banana-2-lite) or a
// free-text one we can't enumerate (the Recraft trio), and stays flat.
const IMAGE_REFERENCE_SETTINGS: Record<string, { size?: string; quality?: string }> = {
  // The Recraft trio spells its size as raw pixels and used to be a free-text
  // box, so there was no bounded set of values to price against. Now that it
  // offers a picker (suggestedValues in cloudflare-models.ts) it prices like
  // every other size control.
  "recraft/recraftv4-1": { size: "1024x1024" },
  "recraft/recraftv4-1-pro": { size: "2048x2048" },
  "recraft/recraftv4-1-vector": { size: "1024x1024" },
  "google/nano-banana-pro": { size: "2K" },
  "openai/gpt-image-2": { size: "1024x1024", quality: "medium" },
  "xai/grok-imagine-image": { size: "1k" },
  "xai/grok-imagine-image-quality": { size: "2k", quality: "high" },
  "bytedance/seedream-5-pro": { size: "2K" },
  "bytedance/seedream-4.5": { size: "2K" },
  "bytedance/seedream-5-lite": { size: "2K" },
};

// gpt-image-2 spells its sizes as raw pixel dimensions ("1536x1024") rather
// than a 1K/2K tier, so those are measured instead of looked up — same
// linear-dimension rule, expressed against a 1024x1024 baseline.
function pixelSizeFactor(value: string): number | undefined {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) return undefined;
  return Math.sqrt(Number(match[1]) * Number(match[2])) / 1024;
}

/** Undefined when the value carries no size information we can price on — an
 *  unknown spelling, or "auto" (the model picks) — both of which fall back to
 *  the model's reference size so the ratio comes out at 1. */
function sizeFactor(value: string | undefined): number | undefined {
  if (!value || value === "auto") return undefined;
  return IMAGE_SIZE_FACTOR[value] ?? pixelSizeFactor(value);
}

function qualityFactor(value: string | undefined): number | undefined {
  if (!value) return undefined;
  return IMAGE_QUALITY_FACTOR[value];
}

/** Scales the base cost by how far a requested setting sits from the model's
 *  reference one. Either side being unpriceable means "no information", which
 *  has to read as 1x — never a silent up- or downcharge. */
function settingRatio(
  requested: string | undefined,
  reference: string | undefined,
  factorOf: (v: string | undefined) => number | undefined,
): number {
  const to = factorOf(requested);
  const from = factorOf(reference);
  if (to === undefined || from === undefined || from === 0) return 1;
  return to / from;
}

// Seedance 2.5 at 1080p routes to kie.ai instead of Cloudflare — Cloudflare's
// integration can't serve it. Real kie.ai per-second cost (dashboard,
// 2026-08-18): 1080p, no reference video, $0.570/s. Every other Seedance 2.5
// request stays on Cloudflare and uses the table above — this branch must
// keep matching usesKieAi() in generation-runner.ts, which routes on
// resolution alone, or we'd quote against a provider we don't actually use.
const SEEDANCE25_KIE_AI_1080P_COST_USD = 0.57;

function cheapestPerSecond(rates: Record<string, number>): number {
  return Math.min(...Object.values(rates));
}

export function estimateVideoCredits(
  model: string,
  durationSeconds: number,
  resolution: VideoResolution | string,
  options: { hasReferenceVideo?: boolean; hasReferenceAudio?: boolean; hasAudio?: boolean } = {},
) {
  // Reference audio raises the assumed length of an auto-duration clip the
  // same way a reference video does (both carry their own timeline the output
  // is fitted to) but NOT the per-second rate, which has only ever been
  // measured for the video mode.
  const effectiveDuration = effectiveVideoSeconds(durationSeconds, {
    hasTimedReference: options.hasReferenceVideo || options.hasReferenceAudio,
  });

  if (model === SEEDANCE_MODEL_ID && resolution === "1080p") {
    return Math.max(
      creditsFor(SEEDANCE_DURATION_MIN, SEEDANCE25_KIE_AI_1080P_COST_USD),
      creditsFor(effectiveDuration, SEEDANCE25_KIE_AI_1080P_COST_USD),
    );
  }

  // A model in the catalog but missing from VIDEO_COST_USD used to throw
  // here ("cannot read properties of undefined"), which surfaced as a 500 on
  // the generate endpoints and blocked the model entirely rather than just
  // mispricing it. Fall back to the Seedance 2.0 table — the reference costs
  // every other entry is scaled from — so a pricing gap can't take a model
  // offline again.
  const entry = VIDEO_COST_USD[model] ?? VIDEO_COST_USD[SEEDANCE2_MODEL_ID];
  const useVideoRates = options.hasReferenceVideo && entry.withReferenceVideo;
  const rates = useVideoRates
    ? entry.withReferenceVideo!
    : options.hasAudio && entry.withAudio
      ? entry.withAudio
      : entry.perSecond;
  const minSeconds = useVideoRates
    ? (entry.minSecondsWithReferenceVideo ?? entry.minSeconds)
    : entry.minSeconds;
  const perSecond = rates[resolution] ?? Math.max(...Object.values(rates));
  return Math.max(
    creditsFor(minSeconds, cheapestPerSecond(rates)),
    creditsFor(effectiveDuration, perSecond),
  );
}

/**
 * `settings` is the size/quality the user actually picked, straight out of
 * the model's own registry field (`size`, `imageSize` or `resolution` — the
 * three spellings different providers use for the same idea, see
 * cloudflare-models.ts). Omit it and every model bills at its default
 * settings, which is exactly what this returned before size scaling existed.
 */
export function estimateImageCredits(
  model: string,
  settings: { size?: string; quality?: string } = {},
) {
  const baseUsd = QUALITY_IMAGE_MODELS.has(model) ? QUALITY_IMAGE_COST_USD : FAST_IMAGE_COST_USD;
  const reference = IMAGE_REFERENCE_SETTINGS[model] ?? {};
  const costUsd =
    baseUsd *
    settingRatio(settings.size, reference.size, sizeFactor) *
    settingRatio(settings.quality, reference.quality, qualityFactor);
  return imageCreditsFor(costUsd);
}

/**
 * Pulls the size/quality out of a model's parameter bag. Providers spell the
 * same idea three different ways in cloudflare-models.ts — Recraft/ByteDance/
 * OpenAI use `size`, Google `imageSize`, xAI `resolution` — so the caller
 * shouldn't have to know which one a given model happens to use. First one
 * present wins; no model defines more than one.
 */
export function imageSettingsFromParameters(
  parameters: Record<string, unknown>,
): { size?: string; quality?: string } {
  const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
  return {
    size: str(parameters.size) ?? str(parameters.imageSize) ?? str(parameters.resolution),
    quality: str(parameters.quality),
  };
}

/**
 * Whether a saved parameter blob asked for a soundtrack.
 *
 * Three spellings, because the registry mirrors each provider's own: Kling
 * 3.0 Omni calls it `audio`, Kling 3.0 and 2.6 call it `sound`, Seedance
 * calls it `generateAudio`. Read here rather than at each call site, so a
 * fourth spelling only has to be added in one place.
 */
export function hasAudioFromParameters(parameters: Record<string, unknown>): boolean {
  return parameters.audio === true || parameters.sound === true || parameters.generateAudio === true;
}

export function estimateCreditsForRequest(input: {
  type: GenerationType;
  model: string;
  durationSeconds?: number;
  resolution?: string;
  hasReferenceVideo?: boolean;
  hasReferenceAudio?: boolean;
  /** Whether a soundtrack was asked for — a separate charge on Kling. Read
   *  off the saved parameters with hasAudioFromParameters. */
  hasAudio?: boolean;
  /** Image only — the picked size and quality. See estimateImageCredits. */
  imageSize?: string;
  imageQuality?: string;
}) {
  if (input.type === "text-to-image") {
    return estimateImageCredits(input.model, { size: input.imageSize, quality: input.imageQuality });
  }
  return estimateVideoCredits(
    input.model,
    input.durationSeconds ?? 5,
    (input.resolution ?? "720p") as VideoResolution,
    {
      hasReferenceVideo: input.hasReferenceVideo,
      hasReferenceAudio: input.hasReferenceAudio,
      hasAudio: input.hasAudio,
    },
  );
}
