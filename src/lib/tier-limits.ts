// Client-side mirror of the server-side tier enforcement in
// aiVideo-backend's generations.ts (VIDEO_RESOLUTION_RANK / maxDurationSeconds
// checks) — used to proactively lock options in the generate forms instead
// of letting the user pick something the backend will reject. The backend
// remains the source of truth; this is UX only.
import { TIER_INFO, TIERS, videoModelSupportsWatermark, type Tier } from "@/lib/constants";

// Keep every rung in step with VIDEO_RESOLUTION_RANK in aiVideo-backend's
// generations.ts — a resolution missing from either map compares as
// undefined and skips the check, which is how Hailuo's 768p and Vidu Q3's
// 540p used to bypass the plan cap on both sides.
export const RESOLUTION_RANK: Record<string, number> = {
  "480p": 1,
  "540p": 2,
  "720p": 3,
  "768p": 4,
  "1080p": 5,
  "4k": 6,
};

type TierLimits = { maxResolution: string; maxDurationSeconds: number; videoWatermark: boolean };

/**
 * Why a video model can't be used on this plan, or undefined when it can.
 *
 * The only such rule today is the forced watermark: a plan that watermarks
 * every video can't run a model whose provider won't add one, and the server
 * refuses that pair outright rather than quietly returning clean video (see
 * the API's lib/generations.ts). Surfaced here so the picker can say so
 * before Generate is pressed, the same way locked resolutions do.
 */
export function modelLockReason(
  modelId: string,
  tierInfo: { videoWatermark?: boolean } | undefined,
): string | undefined {
  if (!tierInfo?.videoWatermark) return undefined;
  if (videoModelSupportsWatermark(modelId)) return undefined;
  const clean = minTierWithoutForcedWatermark();
  return clean
    ? `Needs ${TIER_INFO[clean].label} — this model can't add your plan's watermark.`
    : "Not available on your plan.";
}

export function isResolutionLocked(resolution: string, tierInfo: TierLimits | undefined): boolean {
  if (!tierInfo) return false;
  const requestedRank = RESOLUTION_RANK[resolution];
  const tierRank = RESOLUTION_RANK[tierInfo.maxResolution];
  if (!requestedRank || !tierRank) return false;
  return requestedRank > tierRank;
}

export function isDurationLocked(durationSeconds: number, tierInfo: TierLimits | undefined): boolean {
  if (!tierInfo) return false;
  return durationSeconds > tierInfo.maxDurationSeconds;
}

/**
 * The best resolution in `options` the plan can actually submit, or
 * undefined when the plan can't reach any of them.
 *
 * Every model in the registry defaults to 720p or above while the free plan
 * caps at 480p, so the composer used to open pre-filled with a value the
 * server would reject — the pill showed a locked resolution as the current
 * pick, and the only feedback was a 403 after hitting Generate. Forms call
 * this to open on something submittable instead.
 */
export function bestAllowedResolution(
  options: readonly string[],
  tierInfo: TierLimits | undefined,
): string | undefined {
  if (!tierInfo) return undefined;
  const allowed = options.filter((o) => !isResolutionLocked(o, tierInfo));
  if (allowed.length === 0) return undefined;
  // Highest rank wins — an unranked value sorts lowest, since we can't tell
  // how big it is and would rather not upgrade someone into it silently.
  return allowed.reduce((best, o) =>
    (RESOLUTION_RANK[o] ?? 0) > (RESOLUTION_RANK[best] ?? 0) ? o : best,
  );
}

/** Same idea for a duration picker whose options are a fixed list rather
 *  than a slider range (veo-3.1's "4s"/"6s"/"8s", hailuo-2.3's "6"/"10"). */
export function bestAllowedDuration<T extends string | number>(
  options: readonly T[],
  toSeconds: (option: T) => number,
  tierInfo: TierLimits | undefined,
): T | undefined {
  if (!tierInfo) return undefined;
  const allowed = options.filter((o) => !isDurationLocked(toSeconds(o), tierInfo));
  if (allowed.length === 0) return undefined;
  return allowed.reduce((best, o) => (toSeconds(o) > toSeconds(best) ? o : best));
}

/** The cheapest tier whose maxResolution covers `resolution` — used to word
 * the "Upgrade to X" hint on a locked option. */
export function minTierForResolution(resolution: string): Tier | undefined {
  const requestedRank = RESOLUTION_RANK[resolution];
  if (!requestedRank) return undefined;
  return TIERS.find((t) => (RESOLUTION_RANK[TIER_INFO[t].maxResolution] ?? 0) >= requestedRank);
}

/** The cheapest tier whose maxDurationSeconds covers `durationSeconds`. */
export function minTierForDuration(durationSeconds: number): Tier | undefined {
  return TIERS.find((t) => TIER_INFO[t].maxDurationSeconds >= durationSeconds);
}

/** The cheapest tier that doesn't force a watermark onto every video. */
export function minTierWithoutForcedWatermark(): Tier | undefined {
  return TIERS.find((t) => !TIER_INFO[t].videoWatermark);
}

export function upgradeHint(minTier: Tier | undefined, what: string): string {
  if (!minTier) return `Not available on your plan.`;
  return `Upgrade to ${TIER_INFO[minTier].label} to unlock ${what}.`;
}

/**
 * Whether a plan includes the marketing studio, the editing studio and
 * social publishing (TIER_INFO.creatorSuite).
 *
 * Takes the raw `tier` string off useMe() rather than a TierInfo, because
 * every caller has the string and an unknown tier has to fail closed — a
 * value we don't recognise is not a licence to open the tool.
 */
export function hasCreatorSuite(tier: string | undefined | null): boolean {
  if (!tier) return false;
  return TIER_INFO[tier as Tier]?.creatorSuite ?? false;
}

/** The cheapest plan that includes those three tools — used to word every
 *  upgrade prompt so the copy can't drift from the data. */
export function minTierWithCreatorSuite(): Tier | undefined {
  return TIERS.find((t) => TIER_INFO[t].creatorSuite);
}
