// Which models the Marketing Studio runs on, and how a style's defaults turn
// into a submittable parameter bag.
//
// The studio only offers models that accept a reference image. That's not a
// taste call: the whole premise is "here is my product, here is my talent,
// keep them", and a model with `image: "none"` (Recraft, Lucid Origin, GPT
// Image 2, the fast Nano Banana) silently ignores an uploaded asset — the
// generation would still succeed and still be billed, just without the
// product in it. The full catalog stays one click away at /generate.
//
// Seedream 4.5 and 5-lite are `image: "none"` for that exact reason even
// though their schemas do list an image field — they accept the reference and
// then ignore it, which is the same silent failure with an extra upload step.
// See the probe recorded in cloudflare-models.ts.

import {
  CLOUDFLARE_MODELS,
  getCloudflareModel,
  type CloudflareModelConfig,
} from "@/lib/cloudflare-models";
import {
  styleKind,
  type MarketingKind,
  type MarketingStyle,
} from "@/lib/marketing-styles";
import type { TierInfo } from "@/lib/constants";
import {
  bestAllowedDuration,
  bestAllowedResolution,
  isDurationLocked,
  isResolutionLocked,
  minTierForDuration,
  minTierForResolution,
  upgradeHint,
} from "@/lib/tier-limits";

export const STUDIO_IMAGE_MODELS = CLOUDFLARE_MODELS.filter(
  (m) => m.category === "text-to-image" && m.image !== "none",
);

// text-to-video only. The two image-to-video entries (Alibaba's pair) demand
// an image, which would make the studio unusable before anything is uploaded,
// and the bespoke Seedance 2.5/2.0 forms post to their own endpoints with
// their own schemas — this composer speaks the generic registry payload only.
export const STUDIO_VIDEO_MODELS = CLOUDFLARE_MODELS.filter(
  (m) => m.category === "text-to-video" && m.image !== "none",
);

export function studioModels(kind: MarketingKind): CloudflareModelConfig[] {
  return kind === "image" ? STUDIO_IMAGE_MODELS : STUDIO_VIDEO_MODELS;
}

/** The shape ProviderModelPicker wants — id, label, provider, description. */
export function studioPickerModels(kind: MarketingKind) {
  return studioModels(kind).map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    description: m.description,
  }));
}

export const STUDIO_ENDPOINT: Record<MarketingKind, string> = {
  image: "/api/generations/text-to-image",
  video: "/api/generations/text-to-video",
};

/**
 * The model a style opens on, falling back to the first model of its kind if
 * the catalog ever names one the studio doesn't offer. A wrong id in
 * marketing-styles.ts then costs a slightly-off default instead of a crash on
 * a page that can't render without a config.
 */
export function resolveStyleModel(style: MarketingStyle): CloudflareModelConfig {
  const kind = styleKind(style);
  const models = studioModels(kind);
  return models.find((m) => m.id === style.model) ?? models[0];
}

export function studioModelConfig(id: string, kind: MarketingKind): CloudflareModelConfig {
  const models = studioModels(kind);
  return models.find((m) => m.id === id) ?? getCloudflareModel(id) ?? models[0];
}

/**
 * A model's own defaults, with the style's preferred aspect ratio applied
 * when that model actually offers it.
 *
 * The registry's aspect enums genuinely differ between models (Seedream has
 * no 4:5, Veo has no 21:9), so a style's `aspect` is a preference, not a
 * promise — an unsupported value leaves the model's own default standing
 * rather than travelling to a provider that would reject it.
 */
export function seedStudioParams(
  config: CloudflareModelConfig,
  style: MarketingStyle,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const field of config.fields) {
    if (field.defaultValue !== undefined) params[field.key] = field.defaultValue;
  }
  const aspectField = config.fields.find((f) => f.key === "aspectRatio" && f.type === "select");
  if (aspectField?.options?.includes(style.aspect)) params.aspectRatio = style.aspect;
  return params;
}

/** Duration reaches us as a number range on some models and as a select
 *  spelled "4s"/"6s"/"8s" (Veo) or "6"/"10" (Hailuo) on others. */
export function durationSeconds(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function durationLabel(value: unknown): string {
  const raw = String(value);
  return /s$/.test(raw) ? raw : `${raw}s`;
}

/**
 * Steps a video model's resolution/duration down to what the current plan can
 * submit. Same job the clamping effect in dynamic-model-form.tsx does, and
 * for the same reason: every registry model defaults to 720p or above while
 * the free plan stops at 480p, so an unclamped composer opens pre-filled with
 * a value the server answers with a bare 403.
 *
 * Pure and total — returns a new bag (or the same one when nothing moved), so
 * it's safe to call from an effect without a dependency on the current params.
 */
export function clampParamsToTier(
  config: CloudflareModelConfig,
  params: Record<string, unknown>,
  tierInfo: TierInfo | undefined,
): Record<string, unknown> {
  if (!tierInfo || config.category === "text-to-image") return params;
  const next = { ...params };
  let changed = false;

  const resolutionOptions =
    config.fields.find((f) => f.key === "resolution" && f.type === "select")?.options ?? [];
  const current = next.resolution;
  if (typeof current === "string" && isResolutionLocked(current, tierInfo)) {
    const allowed = bestAllowedResolution(resolutionOptions, tierInfo);
    if (allowed) {
      next.resolution = allowed;
      changed = true;
    }
  }

  const durationOptions =
    config.fields.find((f) => f.key === "duration" && f.type === "select")?.options ?? [];
  const duration = next.duration;
  if (duration !== undefined && isDurationLocked(durationSeconds(duration), tierInfo)) {
    if (durationOptions.length > 0) {
      const allowed = bestAllowedDuration(durationOptions, durationSeconds, tierInfo);
      if (allowed) {
        next.duration = allowed;
        changed = true;
      }
    } else if (typeof duration === "number") {
      next.duration = tierInfo.maxDurationSeconds;
      changed = true;
    }
  }

  return changed ? next : params;
}

/**
 * Why this configuration can't be submitted, if it can't. Covers the case
 * clampParamsToTier has no answer for — a model whose every resolution or
 * duration sits above the plan's ceiling (Veo starts at 720p; the free plan
 * stops at 480p), where the pick stays locked and pressing Generate would
 * only earn a 403.
 */
export function tierBlockedReason(
  config: CloudflareModelConfig,
  params: Record<string, unknown>,
  tierInfo: TierInfo | undefined,
): string | undefined {
  if (!tierInfo || config.category === "text-to-image") return undefined;

  const resolution = params.resolution;
  if (typeof resolution === "string" && isResolutionLocked(resolution, tierInfo)) {
    return upgradeHint(minTierForResolution(resolution), resolution);
  }

  const duration = params.duration;
  if (duration !== undefined && isDurationLocked(durationSeconds(duration), tierInfo)) {
    return upgradeHint(
      minTierForDuration(durationSeconds(duration)),
      `${durationLabel(duration)} clips`,
    );
  }

  return undefined;
}

/** Drops the keys the API has nothing to do with — an unset optional field
 *  ("", undefined) means "the model's default", which the shared zod schema
 *  fills in on both sides. */
export function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );
}
