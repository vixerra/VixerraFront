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
// IMAGE_GROSS_MARGIN (55%, so IMAGE_COST_USD_PER_CREDIT = $0.0045):
//
//   credits = ceil(seconds × usdPerSecond / COST_USD_PER_CREDIT)
//
// Both margins are measured against the provider's price, before Stripe's
// fee: after it, ~44-47% survives on video and ~49-52% on images, depending
// on which plan or pack the credits were bought through.
//
// Before 2026-08-30 credits were sold and spent at par ($0.01 of compute
// per $0.01 credit) and the margin came entirely from tiers granting fewer
// credits than their price would buy. That stopped working once the plans
// were repriced to a flat 1000/2500/5000 credits — at par those grant more
// compute than they cost — so the markup now lives on the generation side,
// where it scales with actual usage instead of with the grant.
const TARGET_GROSS_MARGIN = 0.5;
const COST_USD_PER_CREDIT = CREDIT_VALUE_USD * (1 - TARGET_GROSS_MARGIN);

// Images carry a steeper margin than video. A single image is cheap enough in
// absolute terms that the extra points barely register next to a
// multi-dollar clip, so they are taken here instead of on video where the
// same percentage would cost a user real money per generation. 65% until
// 2026-09-12, when image costs moved from two estimated buckets to kie.ai's
// real per-model table and the margin was set to 55%.
const IMAGE_GROSS_MARGIN = 0.55;
const IMAGE_COST_USD_PER_CREDIT = CREDIT_VALUE_USD * (1 - IMAGE_GROSS_MARGIN);

// Always rounds UP. A credit is too coarse to land on a margin exactly, and
// rounding to nearest sold some clips under target (a 22.5-credit Grok clip
// went for 22). The epsilon stops float noise from charging a whole extra
// credit on a price that is already exact: 5 × 0.07 / 0.005 evaluates to
// 70.00000000000001, which a bare ceil would bill as 71.
const ROUNDING_EPSILON = 1e-9;

function creditsForUsd(costUsd: number, usdPerCredit: number): number {
  return Math.ceil(costUsd / usdPerCredit - ROUNDING_EPSILON);
}

function creditsFor(seconds: number, usdPerSecond: number): number {
  return creditsForUsd(seconds * usdPerSecond, COST_USD_PER_CREDIT);
}

function imageCreditsFor(costUsd: number): number {
  return creditsForUsd(costUsd, IMAGE_COST_USD_PER_CREDIT);
}

// Real provider cost per second of output, keyed by resolution since the
// tiers genuinely differ per model (Seedance 2.5 offers 480p/720p, not
// 720p/1080p).
//
// Wherever kie.ai sells the model, `perSecond` is kie.ai's own published
// rate (kie.ai/fr/pricing, read 2026-09-12). That table is also taken as the
// cost of the Cloudflare-served models: both providers bill them at the same
// price. It replaced the "Plan Tarifaire Créateur" artifact's Seedance table
// and the multipliers derived from it, which undershot Seedance 2.0 and 2.5
// by about a third and overshot Grok, Mini, Wan and HappyHorse several times
// over.
//
// `withReferenceVideo` applies when a reference video is attached, and was
// deliberately NOT moved to kie.ai's table: kie lists that mode as cheaper
// than a plain run, which has not been confirmed on a bill, so it keeps its
// older, higher derivation rather than being cut on the strength of a
// price page.
//
// Entries kie.ai does not sell (Flux 3 Video, Vidu Q3, P-Video) are still
// *estimates*, marked per entry below.
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
  // withReferenceVideo is derived, not measured, and predates the move to
  // kie.ai's rates (see above for why it stayed): the pricing artifact
  // measured 2.0's reference-video mode at a flat ~2.46x its old text->video
  // rate (0.07->0.172, 0.15->0.372, 0.37->0.914, 0.78->1.866), and the same
  // multiplier was applied to 2.5's old base rates. It matters because 2.5
  // accepts up to ten reference videos and a 30s output.
  "bytedance/seedance-2.5": {
    perSecond: { "480p": 0.14, "720p": 0.315 },
    withReferenceVideo: { "480p": 0.253, "720p": 0.573 },
    minSeconds: 4,
    minSecondsWithReferenceVideo: 4,
  },
  "bytedance/seedance-2.0": {
    perSecond: { "480p": 0.095, "720p": 0.205, "1080p": 0.51, "4k": 1.04 },
    withReferenceVideo: { "480p": 0.172, "720p": 0.372, "1080p": 0.914, "4k": 1.866 },
    minSeconds: 4,
    minSecondsWithReferenceVideo: 4,
  },
  // kie.ai lists 480p/720p only, which is all the model accepts (see
  // cloudflare-models.ts). The old 1080p rate was for a tier it never had.
  "bytedance/seedance-2.0-mini": {
    perSecond: { "480p": 0.019, "720p": 0.041 },
    minSeconds: 3,
  },
  // Not on kie.ai — still an estimate: 1.33x (720p) / 1.3x (1080p) of
  // Seedance 2.0's rates as they stood before 2026-09-12.
  "black-forest-labs/flux-3-video": {
    perSecond: { "720p": 0.1995, "1080p": 0.481 },
    minSeconds: 3,
  },
  // kie.ai prices both Grok video models identically, text or image input.
  "xai/grok-imagine-video": {
    perSecond: { "480p": 0.012, "720p": 0.0225 },
    minSeconds: 3,
  },
  "xai/grok-imagine-video-1.5-preview": {
    perSecond: { "480p": 0.012, "720p": 0.0225 },
    minSeconds: 3,
  },
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
  // Omni has no line of its own on kie.ai's table; it bills as Kling 3.0.
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
  // kie.ai's HappyHorse-1.1 image-to-video line.
  "alibaba/hh1.1-i2v": {
    perSecond: { "720p": 0.1125, "1080p": 0.145 },
    minSeconds: 3,
  },
  // kie.ai's wan 2.7 video image-to-video line.
  "alibaba/wan-2.7-i2v": {
    perSecond: { "720p": 0.08, "1080p": 0.12 },
    minSeconds: 3,
  },
  // Google Veo 3.1 is priced per clip, not per second — see
  // VIDEO_CLIP_COST_USD below.
  //
  // Vidu Q3 — not on kie.ai, still estimates. Pro at 1.33x and Turbo at 0.75x
  // of Seedance 2.0's 720p/1080p cost as it stood before 2026-09-12, with 540p
  // carried down proportionally. Both allow 1s clips.
  "vidu/q3-pro": {
    perSecond: { "540p": 0.093, "720p": 0.2, "1080p": 0.49 },
    minSeconds: 1,
  },
  "vidu/q3-turbo": {
    perSecond: { "540p": 0.0525, "720p": 0.1125, "1080p": 0.2775 },
    minSeconds: 1,
  },
  // Pruna P-Video — not on kie.ai and no published per-second cost to scale
  // from, so this is parity with Seedance 2.0's 720p/1080p cost as it stood
  // before 2026-09-12, as a placeholder until real numbers exist. It allows durations down to 1s, unlike everything else
  // here. NOTE: the tables key on resolution only, so a 48fps clip bills
  // the same as 24fps despite rendering twice the frames.
  "pruna/p-video": {
    perSecond: { "720p": 0.15, "1080p": 0.37 },
    minSeconds: 1,
  },
  // MiniMax Hailuo 2.3. kie.ai sells it per clip — Pro tier, the dearer of
  // its two: $0.225 for 6s and $0.45 for 10s at 768p, $0.40 for 6s at 1080p.
  // Folded into one per-second rate each, taken from the most expensive
  // clip at that resolution ($0.045/s at 768p, from the 10s clip), so no
  // duration sells under target — a 6s 768p clip lands above it. The old
  // table charged $0.40 per SECOND at 1080p, six times the real clip price.
  // Its shortest clip is 6s (there is no 3s option).
  "minimax/hailuo-2.3": {
    perSecond: { "768p": 0.045, "1080p": 0.4 / 6 },
    minSeconds: 6,
  },
};

// Models billed a flat price per clip, whatever its length — kie.ai sells
// Veo per video, and Veo only offers 4/6/8s, so a per-second table would
// either overcharge the 8s clip or undercharge the 4s one. Keyed by
// resolution like VIDEO_COST_USD. None of these accept a reference video.
// veo-3.1 is kie.ai's "Quality" line, veo-3.1-fast its "Fast" line.
const VIDEO_CLIP_COST_USD: Record<string, Record<string, number>> = {
  "google/veo-3.1": { "720p": 1.25, "1080p": 1.275 },
  "google/veo-3.1-fast": { "720p": 0.3, "1080p": 0.325 },
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

// ── Image cost ───────────────────────────────────────────────────────────
// Real provider cost of ONE image, per model. Where kie.ai sells the model
// this is kie.ai's published price (kie.ai/fr/pricing, read 2026-09-12),
// taken as the Cloudflare cost too — both bill these models the same.
//
// A number is a flat price at any size. A table is a price per size, keyed by
// the spelling the model's own registry field uses (ByteDance writes "2K",
// OpenAI "1024x1024" — see cloudflare-models.ts); a size the table does not
// list, "auto", or no size at all prices at the model's default size.
//
// Quality is not priced: none of these providers charge by it on kie.ai's
// table, so gpt-image-2 "high" costs what "low" does.
//
// This replaced a two-bucket estimate ($0.01 "fast" / $0.05 "quality") scaled
// by size, which kie.ai's table showed to be wrong both ways: Seedream 4.5 and
// Nano Banana Pro at 1K were selling below cost, GPT Image 2 at five times it.
//
// Not on kie.ai, so still estimates:
//   - the Recraft trio keeps its old bucket, scaled by linear dimension from
//     its default size (see recraftSizeRatio below);
//   - Lucid Origin uses Cloudflare's own published rate, $0.007 per 512x512
//     tile + $0.00013 per step: its default 1120x1120 is ~4.8 tiles, which at
//     the 40-step ceiling is ~$0.039, rounded up to $0.04.
const IMAGE_COST_USD: Record<string, number | Record<string, number>> = {
  "recraft/recraftv4-1": 0.01,
  "recraft/recraftv4-1-vector": 0.01,
  "recraft/recraftv4-1-pro": 0.05,
  "@cf/leonardo/lucid-origin": 0.04,
  "google/nano-banana-2-lite": 0.02,
  "google/nano-banana-pro": { "1K": 0.09, "2K": 0.09, "4K": 0.12 },
  // kie.ai only lists 1k/2k/4k tiers. The two non-square sizes carry ~1.5x
  // the pixels of 1024x1024, and "auto" may pick one of them, so all three
  // are priced at the 2k line rather than assumed to fit the 1k one.
  "openai/gpt-image-2": { "1024x1024": 0.03, "1024x1536": 0.05, "1536x1024": 0.05, auto: 0.05 },
  // kie.ai quotes Grok Imagine at $0.02 — per call for two images on one
  // line, per image on its 2.0 line. The per-image reading is the dearer one.
  // Both resolutions cost the same.
  "xai/grok-imagine-image": 0.02,
  "xai/grok-imagine-image-quality": 0.025,
  "bytedance/seedream-5-pro": { "1K": 0.035, "2K": 0.07 },
  "bytedance/seedream-4.5": 0.0325,
  "bytedance/seedream-5-lite": 0.0275,
};

// For a model missing from the table above. Priced high on purpose: the old
// fallback was the cheapest bucket, so a new model that nobody priced went on
// sale at a loss the day it was added.
const UNKNOWN_IMAGE_COST_USD = 0.05;

// Each table model's default size, i.e. its `defaultValue` in
// cloudflare-models.ts — what an unlisted or missing size prices at.
const IMAGE_DEFAULT_SIZE: Record<string, string> = {
  "google/nano-banana-pro": "2K",
  "openai/gpt-image-2": "1024x1024",
  "bytedance/seedream-5-pro": "2K",
  "recraft/recraftv4-1": "1024x1024",
  "recraft/recraftv4-1-vector": "1024x1024",
  "recraft/recraftv4-1-pro": "2048x2048",
};

// The Recraft trio is the one place size is still scaled rather than looked
// up: its size field is free text with a two-value picker, and there is no
// provider price per size to read. It scales with the image's LINEAR
// dimension (the square root of its pixel count), not with pixels — no
// provider in this catalog charges anything close to 16x for 4x the width.
function pixelDimension(value: string | undefined): number | undefined {
  const match = value ? /^(\d+)x(\d+)$/.exec(value) : null;
  if (!match) return undefined;
  return Math.sqrt(Number(match[1]) * Number(match[2]));
}

/** 1 whenever either size is unreadable — never a silent up- or downcharge. */
function recraftSizeRatio(model: string, requested: string | undefined): number {
  const to = pixelDimension(requested);
  const from = pixelDimension(IMAGE_DEFAULT_SIZE[model]);
  if (to === undefined || from === undefined) return 1;
  return to / from;
}

function imageCostUsd(model: string, size: string | undefined): number {
  const cost = IMAGE_COST_USD[model];
  if (cost === undefined) return UNKNOWN_IMAGE_COST_USD;
  if (typeof cost === "number") {
    return model.startsWith("recraft/") ? cost * recraftSizeRatio(model, size) : cost;
  }
  const fallback = IMAGE_DEFAULT_SIZE[model];
  return (
    (size !== undefined ? cost[size] : undefined) ??
    (fallback !== undefined ? cost[fallback] : undefined) ??
    Math.max(...Object.values(cost))
  );
}

// Seedance 2.5 at 1080p routes to kie.ai instead of Cloudflare — Cloudflare's
// integration can't serve it. Real kie.ai per-second cost (dashboard,
// 2026-08-18, and the same on its pricing table 2026-09-12): 1080p, no
// reference video, $0.570/s. Every other Seedance 2.5
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

  const clipRates = VIDEO_CLIP_COST_USD[model];
  if (clipRates) {
    const clipUsd = clipRates[resolution] ?? Math.max(...Object.values(clipRates));
    return creditsForUsd(clipUsd, COST_USD_PER_CREDIT);
  }

  // A model in the catalog but missing from VIDEO_COST_USD used to throw
  // here ("cannot read properties of undefined"), which surfaced as a 500 on
  // the generate endpoints and blocked the model entirely rather than just
  // mispricing it. Fall back to the Seedance 2.0 table, a mid-priced model
  // with every resolution up to 4K, so a pricing gap can't take a model
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
 * cloudflare-models.ts). Omit it and every model bills at its default size.
 * `quality` is accepted so callers can pass imageSettingsFromParameters
 * straight through, but no model is priced on it (see IMAGE_COST_USD).
 */
export function estimateImageCredits(
  model: string,
  settings: { size?: string; quality?: string } = {},
) {
  return imageCreditsFor(imageCostUsd(model, settings.size));
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
