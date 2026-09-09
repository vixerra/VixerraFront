// DUPLIQUÉ dans aiVideo-backend/src/lib/constants.ts (et son miroir Deno
// supabase/functions/api/lib/constants.ts) — garder synchronisé.
import { CLOUDFLARE_MODELS } from "@/lib/cloudflare-models";

// The selling price of one credit. Every plan and pack below charges exactly
// this ($9.99 → 1,000, $24 → 2,500, $49 → 5,000, packs likewise), so it is
// also the honest figure to show users next to a credit amount (e.g. "this
// generation costs ~$2.31").
//
// It is ALSO the base credit-estimate.ts prices generations from: a credit
// may buy CREDIT_VALUE_USD × (1 - TARGET_GROSS_MARGIN) = $0.005 of provider
// compute on video, or $0.0035 on images (they carry a steeper 65% margin).
// The margin therefore rides on every generation. Until 2026-08-30 it
// worked the other way round — generations were priced at cost (1 credit =
// $0.01 of compute) and the margin came from tiers granting fewer credits
// than their price would buy. Flat 1,000/2,500/5,000 grants inverted that
// (they'd hand out more compute than they cost), so the markup moved to the
// generation side, where it also scales with how much a user actually
// generates. See the "Plan Tarifaire Créateur" pricing artifact for the
// underlying provider cost table.
export const CREDIT_VALUE_USD = 0.01;

export const TIERS = ["free", "starter", "creator", "studio"] as const;
export type Tier = (typeof TIERS)[number];

// One disclosure per plan card. Every "~N" figure in a card is computed at the
// cheapest settings the credits can be spent on, because that is the most the
// plan can produce. That caveat used to sit inline in the bullets themselves
// ("(720p)", "(fast models)"), where it read as a cap on the plan rather than
// as the floor price the number was computed at. It now lives in a single info
// bubble under the list (PlanFeatureList, frontend side), so a bullet carries
// its number and nothing else.
const ESTIMATES_NOTE =
  "Estimates. Unless a line says otherwise, every figure above is what these " +
  "credits buy at each model's cheapest settings — 480p for video, and the " +
  "fast image models. Higher resolutions and the quality image models cost " +
  "more per generation, so the same credits stretch proportionally less far.";

// The Free plan can't reach Seedance 2.0 at all (its shortest clip costs 56
// credits, past the 50-credit budget), so that card advertises the Mini variant
// and its note says why.
const ESTIMATES_NOTE_FREE =
  "Estimates. Every figure above is what these credits buy at each model's " +
  "cheapest settings — 480p, which is also this plan's ceiling, and the fast " +
  "image models. Seedance 2.0 itself needs 56 credits for its shortest clip, " +
  "just past the budget here, so its Mini variant is what these credits reach.";

export const TIER_INFO: Record<
  Tier,
  {
    label: string;
    priceMonthly: number;
    /** The size of a plan grant. Granted every calendar month when
     *  renewsMonthly is true, once ever when it isn't. */
    monthlyCredits: number;
    /**
     * Whether monthlyCredits is granted again every calendar month.
     *
     * Free is a one-time welcome grant, not an allowance: 50 credits when
     * the account is created, never refilled. rolloverMonths is not
     * consulted at all when this is false — credits that never come back
     * must not be taken away either, so the grant simply never expires.
     * See ensurePlanGrant in the API's lib/credits.ts.
     */
    renewsMonthly: boolean;
    maxResolution: string;
    maxDurationSeconds: number;
    concurrentGenerations: number;
    // Extra months a monthly grant stays spendable after the month it was
    // granted in — 0 = expires at month end, 1 = "1-month rollover".
    rolloverMonths: number;
    videoWatermark: boolean;
    commercialLicense: boolean;
    seats: number;
    priorityQueue: boolean;
    apiAccess: boolean;
    /**
     * Marketing studio, editing studio, and publishing to linked social
     * accounts - the three tools the Creator card sells as one step up the
     * ladder.
     *
     * One flag rather than three because they are priced as one step; split
     * it the day they stop being. Every gate reads this and nothing else:
     * the /studio and /editor routes and the publish button on the frontend,
     * and the connect/publish endpoints in routes/social.ts on the API side.
     * Before it existed the three were advertised on two plans and open to
     * all four.
     */
    creatorSuite: boolean;
    features: string[];
    /** One disclosure for the whole card, see ESTIMATES_NOTE. */
    featuresNote: string;
  }
> = {
  // Credits recalibrated 2026-08-30: every plan sells credits at a flat
  // CREDIT_VALUE_USD ($0.01) — $9.99 → 1,000, $24 → 2,500, $49 → 5,000 — and
  // the margin now comes from generation pricing instead (credit-estimate.ts
  // bills video at a 50% gross margin over real provider cost, images at
  // 65%).
  // Spending a plan's credits in full on video therefore costs us half its
  // price: ~50% gross, ~39-40% net of the ~2.9%+$0.30 Stripe fee and the ~5%
  // storage/support/hosting overhead — still clearing the 40% net floor the
  // v2 pricing was built around, but with no headroom left, so a further
  // credit increase has to be paid for by raising prices or the margin in
  // credit-estimate.ts. That is the video-only worst case: images bill at a
  // 66.7% gross margin (~56-57% net), so an image-heavy user is the
  // comfortable one. maxResolution/maxDurationSeconds/
  // concurrentGenerations/videoWatermark/priorityQueue/apiAccess are enforced
  // server-side (see aiVideo-backend's generations.ts).
  free: {
    label: "Free",
    priceMonthly: 0,
    monthlyCredits: 50,
    renewsMonthly: false,
    // Capped at 480p (not 720p): the cheapest 5s 720p clip is 113 credits,
    // more than the entire free budget. Even at 480p, 50 credits only
    // reaches the shortest clip on the cheapest model (Seedance 2.0 Mini,
    // 3s @ 480p = 32 credits) — Seedance 2.5's 4s floor is 82 credits, out
    // of reach since generations started carrying the margin. Raising this
    // to ~110 would put one 5s Seedance 2.5 480p clip (103 credits) back in
    // range, if the free tier should demo the flagship model.
    maxResolution: "480p",
    maxDurationSeconds: 5,
    concurrentGenerations: 1,
    // Unused on this plan: renewsMonthly is false, so the grant is issued
    // with no expiry at all and there is nothing to roll over.
    rolloverMonths: 0,
    videoWatermark: true,
    commercialLicense: false,
    seats: 1,
    priorityQueue: false,
    creatorSuite: false,
    apiAccess: false,
    features: [
      "50 one-time credits, no monthly refill",
      "~16 images",
      "~4s Seedance 2.0 Mini video",
      "Credits never expire",
      "Video watermark",
      "Standard queue",
    ],
    featuresNote: ESTIMATES_NOTE_FREE,
  },
  starter: {
    label: "Starter",
    priceMonthly: 9.99,
    monthlyCredits: 1000,
    renewsMonthly: true,
    maxResolution: "1080p",
    maxDurationSeconds: 20,
    concurrentGenerations: 2,
    rolloverMonths: 0,
    videoWatermark: false,
    commercialLicense: true,
    seats: 1,
    priorityQueue: false,
    creatorSuite: false,
    apiAccess: false,
    features: [
      "1,000 credits / month",
      "~333 images",
      "~71s Seedance 2.0 video",
      "~21s Seedance 2.5 video",
      "Add credits as needed",
      "Up to 1080p",
      "No watermark",
      "Commercial license",
      "Standard queue",
    ],
    featuresNote: ESTIMATES_NOTE,
  },
  creator: {
    label: "Creator",
    priceMonthly: 24,
    monthlyCredits: 2500,
    renewsMonthly: true,
    maxResolution: "1080p",
    maxDurationSeconds: 30,
    concurrentGenerations: 3,
    rolloverMonths: 1,
    videoWatermark: false,
    commercialLicense: true,
    seats: 1,
    priorityQueue: true,
    creatorSuite: true,
    apiAccess: false,
    features: [
      "2,500 credits / month",
      "~833 images",
      "~178s Seedance 2.0 video",
      "~54s Seedance 2.5 video",
      "Marketing studio for ad-ready campaigns",
      "Editing studio: trim, caption, export",
      "Publish to TikTok, Instagram, YouTube & Facebook",
      "Up to 1080p, no watermark",
      "Commercial license",
      "Priority queue",
      "Unused credits roll over 1 month",
      "Add credits as needed",
    ],
    featuresNote: ESTIMATES_NOTE,
  },
  studio: {
    label: "Studio",
    priceMonthly: 49,
    monthlyCredits: 5000,
    renewsMonthly: true,
    // Only tier allowed to spend credits on 4K (Seedance 2.0) generations.
    maxResolution: "4k",
    maxDurationSeconds: 30,
    concurrentGenerations: 5,
    rolloverMonths: 1,
    videoWatermark: false,
    commercialLicense: true,
    // Total seats INCLUDING the owner: "you plus 3 teammates". The backend's
    // seat checks count the owner as one, so this must stay in step with
    // TIER_INFO in aivioback's supabase/functions/api/lib/constants.ts.
    seats: 4,
    priorityQueue: true,
    creatorSuite: true,
    apiAccess: true,
    features: [
      "5,000 credits / month",
      "~1,666 images",
      "~357s Seedance 2.0 video",
      "~108s Seedance 2.5 video",
      "~32s Seedance 2.0 video (4K, exclusive)",
      "Marketing studio for ad-ready campaigns",
      "Editing studio: trim, caption, export",
      "Publish to TikTok, Instagram, YouTube & Facebook",
      "Commercial license",
      "API access",
      "You + 3 teammates",
      "Priority queue",
      "Unused credits roll over 1 month",
      "Add credits as needed",
    ],
    featuresNote: ESTIMATES_NOTE,
  },
};
export type TierInfo = (typeof TIER_INFO)[Tier];

// Display-only annual-billing prices ("1 month free" ≈ 8.3% off monthly,
// pay 11 months for 12) — payments are simulated in this build, so this
// isn't wired to any real billing cycle. Kept intentionally more modest than
// a typical 17-20% annual discount: an annual discount cuts the price but
// not the credits, so it comes straight out of margin — at ~50% gross, a
// 20% discount would leave well under 30% net.
export const ANNUAL_PRICE_MONTHLY: Partial<Record<Tier, number>> = {
  starter: 9.16,
  creator: 22,
  studio: 44.92,
};

// Pay-per-use top-ups — priced at exactly CREDIT_VALUE_USD, same as the
// plans (2026-08-30): a credit costs a cent wherever you buy it. They used
// to carry a ~70% premium ($0.017/credit), which stopped making sense once
// plan credits were repriced to $0.01. Note pack_5000 grants the same 5,000
// credits as Studio for the same $49 — the plan's draw is its features (4K,
// API, seats, priority), not a better credit rate. These credits never
// expire (see grantRecharge in aiVideo-backend's credits.ts), unlike the
// monthly plan grants above.
export const RECHARGE_PACKS = [
  { id: "pack_500", credits: 500, priceUsd: 4.99 },
  { id: "pack_2000", credits: 2000, priceUsd: 19.99 },
  { id: "pack_5000", credits: 5000, priceUsd: 49 },
] as const;
export type RechargePackId = (typeof RECHARGE_PACKS)[number]["id"];

export const GENERATION_TYPES = [
  "text-to-video",
  "image-to-video",
  "text-to-image",
] as const;
export type GenerationType = (typeof GENERATION_TYPES)[number];

export const GENERATION_STATUSES = [
  "pending",
  "queued",
  "processing",
  "completed",
  "failed",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

// Entries derived from the generic model registry (cloudflare-models.ts)
// instead of hand-duplicated here, so the catalog and the actual Cloudflare
// wiring can't drift out of sync.
const DYNAMIC_VIDEO_ENTRIES = CLOUDFLARE_MODELS.filter(
  (m) => m.category === "text-to-video" || m.category === "image-to-video",
).map((m) => ({
  id: m.id,
  label: m.label,
  provider: m.provider,
  description: m.description,
}));

const DYNAMIC_IMAGE_ENTRIES = CLOUDFLARE_MODELS.filter((m) => m.category === "text-to-image").map(
  (m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    description: m.description,
  }),
);

export const VIDEO_MODELS = [
  {
    id: "bytedance/seedance-2.5",
    label: "Seedance 2.5",
    provider: "ByteDance",
    description: "Up to 30s, reference control & audio",
  },
  {
    id: "bytedance/seedance-2.0",
    label: "Seedance 2.0",
    provider: "ByteDance",
    description: "Up to 4K, fixed camera & native audio",
  },
  ...DYNAMIC_VIDEO_ENTRIES,
] as const;
export type VideoModelId = (typeof VIDEO_MODELS)[number]["id"];

export const IMAGE_MODELS = [...DYNAMIC_IMAGE_ENTRIES] as const;
export type ImageModelId = (typeof IMAGE_MODELS)[number]["id"];

export const VIDEO_DURATIONS = [3, 5, 10, 15, 20] as const;
export const VIDEO_RESOLUTIONS = ["720p", "1080p"] as const;
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];
export const VIDEO_FPS = [24, 48] as const;
export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1", "21:9"] as const;

export const IMAGE_RESOLUTIONS = [
  "512x512",
  "768x768",
  "1024x1024",
  "1536x1536",
] as const;
export type ImageResolution = (typeof IMAGE_RESOLUTIONS)[number];
export const IMAGE_ASPECT_RATIOS = ["1:1", "4:3", "16:9", "21:9"] as const;
// Prompt-side style presets offered by the image composer. They are not
// model parameters (the backend builds those strictly from the registry) —
// each one appends a medium/treatment fragment to the prompt, which is the
// only notion of "style" all nine image models read the same way. The
// per-preset wording lives frontend-side in image-styles.ts; this list is the
// shared vocabulary, and the legacy text-to-image schema validates against it.
export const IMAGE_STYLE_PRESETS = [
  "Photorealistic",
  "Cinematic",
  "Product Photo",
  "Oil Painting",
  "Watercolor",
  "Anime",
  "Comic Book",
  "Cartoon",
  "3D Render",
  "Isometric",
  "Pixel Art",
  "Line Art",
  "Sketch",
  "Concept Art",
] as const;

export const MOTION_INTENSITIES = ["low", "medium", "high"] as const;
export const CAMERA_MOVEMENTS = ["none", "subtle", "dynamic"] as const;

// Seedance 2.5's own parameter set (confirmed via Cloudflare's input JSON
// schema, 2026-08-14) — deliberately separate from the generic
// VIDEO_DURATIONS/VIDEO_RESOLUTIONS/VIDEO_ASPECT_RATIOS above rather than
// merged, since the allowed values genuinely differ per model (e.g. 480p/
// 720p only, no 1080p; duration is a continuous 4-30 range plus -1 "auto").

// Longest prompt the composer accepts, enforced by every generation schema
// that takes free-form prompt text (the two Seedance schemas and
// buildDynamicSchema, i.e. the whole model catalog) and by the preset
// editor's composed-recipe check in routes/admin-presets.ts.
//
// 2000 is the PROVIDER's ceiling, not a round number of ours. Confirmed live:
// raising this to 4000 made Cloudflare reject the run outright with
//
//   Cloudflare AI request failed (400): Model execution failed (User Input
//   Error): Invalid value at prompt: Too big: expected string to have <=2000
//   characters
//
// — and by then the generation had already been created and billed (the
// refund in failGeneration is what gets the credits back). So this cap is
// what keeps an over-long prompt a free validation error at submit time
// instead of a failed job. Don't raise it without a provider change to point
// at.
export const PROMPT_MAX_LENGTH = 2000;

export const SEEDANCE_MODEL_ID = "bytedance/seedance-2.5";
export const SEEDANCE_DURATION_MIN = 4;
export const SEEDANCE_DURATION_MAX = 30;
export const SEEDANCE_DURATION_AUTO = -1;
// 1080p isn't offered by Cloudflare's Seedance 2.5 integration — those
// requests route to kie.ai instead, on resolution alone (see usesKieAi in
// aiVideo-backend's generation-runner.ts). That provider's task takes a first
// frame and nothing else, which is why validation.ts refuses 1080p together
// with any of the reference lists below.
export const SEEDANCE_RESOLUTIONS = ["480p", "720p", "1080p"] as const;
export const SEEDANCE_ASPECT_RATIOS = [
  "adaptive",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
  "21:9",
] as const;
export const SEEDANCE_OUTPUT_FORMATS = ["mp4", "mov"] as const;

// Seedance 2.5's multimodal reference slots — the three lists it accepts
// alongside (or instead of) the single image/last_frame_image pair. Ceilings
// straight off the provider's own input schema:
//
//   reference_images   0-30, guide multimodal generation, editing, extension
//   reference_videos   0-10, style/motion guidance, video editing/extension
//   reference_audios   0-10, and the one input that needs no visual at all —
//                      2.5 takes audio with no image and no video
//
// Both timed lists carry the same 30s total-duration ceiling (per list, not
// across the two). The API cannot verify that — it has no video toolchain
// (see aiVideo-backend/AGENTS.md) — so this composer measures each file as it
// is picked and the provider is the backstop. The per-list COUNTS are
// re-checked server-side for the same reason 2.0's are: a request written by
// anything but this composer must not be able to hand the model a longer list
// than it accepts.
export const SEEDANCE_REFERENCE_IMAGES_MAX = 30;
export const SEEDANCE_REFERENCE_VIDEOS_MAX = 10;
export const SEEDANCE_REFERENCE_AUDIOS_MAX = 10;
export const SEEDANCE_REFERENCE_MEDIA_MAX_SECONDS = 30;

// Seedance 2.0's own parameter set (confirmed via the ByteDance/Cloudflare
// integration guide, 2026-08-14) — kept separate from the 2.5 constants
// above since the two models genuinely differ: no -1 "auto" duration, a
// wider resolution ceiling (up to 4K), a real camera_fixed toggle (2.5
// documents it as unsupported), and no output_format choice.
export const SEEDANCE2_MODEL_ID = "bytedance/seedance-2.0";

/**
 * Whether a video model will actually carry the forced watermark a
 * videoWatermark tier owes.
 *
 * Only some provider schemas accept the flag at all, so the old rule -
 * set watermark=true if the payload happens to carry the key - silently
 * produced clean video on every model that does not, making a plan limit
 * depend on which model was picked rather than on the plan. Generation now
 * refuses the combination outright (see lib/generations.ts), which needs a
 * straight answer to whether a model can be watermarked at all.
 *
 * The two Seedance flagships are hand-wired routes rather than registry
 * entries (their watermark field lives in the request schemas in
 * validation.ts), so they are named here; every other model is read off the
 * registry, so a new one answers correctly the day it lands.
 */
export function videoModelSupportsWatermark(modelId: string): boolean {
  if (modelId === SEEDANCE_MODEL_ID || modelId === SEEDANCE2_MODEL_ID) return true;
  const config = CLOUDFLARE_MODELS.find((m) => m.id === modelId);
  if (!config || config.category === "text-to-image") return false;
  return config.fields.some((f) => f.key === "watermark");
}
export const SEEDANCE2_DURATION_MIN = 4;
export const SEEDANCE2_DURATION_MAX = 12;
export const SEEDANCE2_RESOLUTIONS = ["480p", "720p", "1080p", "4k"] as const;
export const SEEDANCE2_ASPECT_RATIOS = [
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
  "21:9",
  "9:21",
] as const;

// Seedance 2.0's subject-reference slots: up to four stills of the people or
// objects that must stay recognisable across the clip (`reference_images` on
// the wire). Distinct from the single `image`, which is a whole-frame
// reference the model composes from — these say "this is who/what appears",
// not "this is what the shot looks like".
export const SEEDANCE2_REFERENCE_IMAGES_MAX = 4;
