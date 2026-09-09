// Client-side types and helpers for the viral-preset catalogue.
//
// The catalogue itself no longer lives here. It moved into the backend's
// "Preset" table so the admin panel can add and edit recipes without a
// deploy, and so a recipe can name ANY model in the Workers AI catalogue
// instead of being pinned to bytedance/seedance-2.0 — see
// aiVideo-backend's lib/presets.ts and routes/admin-presets.ts. Fetch
// presets with the hooks in src/hooks/use-presets.ts.
//
// What stays here is the part the browser needs: the shape of a preset as
// the API serves it, and the plan step-down that decides what the studio
// SHOWS it is about to submit. The server runs the same step-down for real
// (fitPresetToPlan) and neither side trusts the other — this is UX only,
// exactly like the rest of tier-limits.ts.
//
// Note what a preset no longer carries: `prompt` and `referenceSubject` are
// not in the public payload at all. The recipe is the thing a preset sells,
// and the browser has no reason to hold it — the generation request sends a
// slug and the server reads the row.

import {
  SEEDANCE_MODEL_ID,
  SEEDANCE_DURATION_MIN,
  SEEDANCE_DURATION_MAX,
  SEEDANCE_RESOLUTIONS,
  SEEDANCE2_MODEL_ID,
  SEEDANCE2_DURATION_MIN,
  SEEDANCE2_DURATION_MAX,
  SEEDANCE2_RESOLUTIONS,
  type TierInfo,
} from "@/lib/constants";
import { getCloudflareModel } from "@/lib/cloudflare-models";
import { RESOLUTION_RANK } from "@/lib/tier-limits";
import { estimateVideoCredits, estimateImageCredits } from "@/lib/credit-estimate";

export const PRESET_CATEGORIES = ["Trending", "Portrait", "Product", "Motion", "Playful"] as const;
export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

/** A published preset, as GET /api/presets serves it. */
export type Preset = {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  /** Style-preview clip, ready to play: a signed R2 bucket URL for anything
   * an operator uploaded, or one of the app's own bundled /media/videos
   * clips for the recipes that predate the table. The signature is minted
   * per response and expires, so this is not a value to persist anywhere.
   * It shows the KIND of shot the preset aims for and the UI must keep
   * framing it that way; it is not this preset's own output. */
  previewUrl: string;
  badge: string | null;
  /** Any video model in the catalogue — no longer always Seedance. */
  model: string;
  /** That model's own wire parameters. Keys and value spellings differ per
   * model, which is why nothing here reads `parameters.duration` directly. */
  parameters: Record<string, unknown>;
  /** The image model that redraws the upload into a character before the
   * video model runs, or null when the photo is animated directly. Its
   * instruction stays server-side — this is here so the studio can price
   * the second model call and say what is about to happen. */
  styleModel: string | null;
  styleParameters: Record<string, unknown>;
  requiresImage: boolean;
};

/** Duration in seconds, whatever spelling the model uses ("6s", "6", 6). */
export function presetDurationSeconds(parameters: Record<string, unknown>): number | undefined {
  const value = parameters.duration;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function presetResolution(parameters: Record<string, unknown>): string | undefined {
  return typeof parameters.resolution === "string" ? parameters.resolution : undefined;
}

/** The resolution values THIS model offers. */
export function presetResolutionOptions(modelId: string): readonly string[] | undefined {
  if (modelId === SEEDANCE_MODEL_ID) return SEEDANCE_RESOLUTIONS;
  if (modelId === SEEDANCE2_MODEL_ID) return SEEDANCE2_RESOLUTIONS;
  const field = getCloudflareModel(modelId)?.fields.find((f) => f.key === "resolution");
  return field?.type === "select" ? field.options : undefined;
}

/**
 * How this model expresses duration. Not one shape across the catalogue: a
 * number of seconds for most, but a fixed list of strings for Veo ("4s",
 * "6s", "8s") and Hailuo ("6", "10"). A step-down has to land on a value the
 * model will accept, not just a smaller number.
 */
export type PresetDurationRule =
  | { kind: "range"; min: number; max: number }
  | { kind: "options"; values: readonly string[] };

export function presetDurationRule(modelId: string): PresetDurationRule | undefined {
  if (modelId === SEEDANCE_MODEL_ID) {
    return { kind: "range", min: SEEDANCE_DURATION_MIN, max: SEEDANCE_DURATION_MAX };
  }
  if (modelId === SEEDANCE2_MODEL_ID) {
    return { kind: "range", min: SEEDANCE2_DURATION_MIN, max: SEEDANCE2_DURATION_MAX };
  }
  const field = getCloudflareModel(modelId)?.fields.find((f) => f.key === "duration");
  if (!field) return undefined;
  if (field.type === "select" && field.options) return { kind: "options", values: field.options };
  if (field.type === "number") return { kind: "range", min: field.min ?? 1, max: field.max ?? 30 };
  return undefined;
}

/** How the studio labels a preset's length on a chip. Keeps the model's own
 *  spelling where it has one ("6s" stays "6s"). */
export function presetDurationLabel(parameters: Record<string, unknown>): string {
  const raw = parameters.duration;
  if (typeof raw === "string") return /s$/i.test(raw) ? raw : `${raw}s`;
  const seconds = presetDurationSeconds(parameters);
  return seconds === undefined ? "—" : `${seconds}s`;
}

/**
 * What this preset will actually be submitted as on the current plan.
 *
 * A preset hides its settings, so a free-plan user pressing Generate on a
 * 1080p/6s recipe would otherwise get a bare 403 with nothing on screen
 * explaining it. Instead the settings step down to the best the plan allows
 * and the change is STATED (`notes`) rather than made silently.
 * `blockedReason` covers the case where nothing can be stepped down to.
 *
 * Model-aware since the catalogue opened up: the step-down has to land on a
 * value the preset's own model accepts — 768p rather than 720p for Hailuo,
 * "6s" rather than 6 for Veo — so it reads that model's option list instead
 * of a fixed Seedance ladder.
 *
 * Mirrors fitPresetToPlan in the backend's lib/presets.ts. That one is
 * authoritative; keep the two in step.
 */
export function resolvePresetSettings(
  preset: Pick<Preset, "model" | "parameters">,
  tierInfo: TierInfo | undefined,
): {
  parameters: Record<string, unknown>;
  durationSeconds: number | undefined;
  resolution: string | undefined;
  notes: string[];
  blockedReason?: string;
} {
  const fitted = { ...preset.parameters };
  const notes: string[] = [];
  const done = () => ({
    parameters: fitted,
    durationSeconds: presetDurationSeconds(fitted),
    resolution: presetResolution(fitted),
    notes,
  });

  if (!tierInfo) return done();

  const wantedResolution = presetResolution(fitted);
  const planRank = RESOLUTION_RANK[tierInfo.maxResolution];
  const wantedRank = wantedResolution ? RESOLUTION_RANK[wantedResolution] : undefined;

  if (wantedResolution && wantedRank && planRank && wantedRank > planRank) {
    const allowed = (presetResolutionOptions(preset.model) ?? [])
      .filter((option) => {
        const rank = RESOLUTION_RANK[option];
        return rank !== undefined && rank <= planRank;
      })
      .sort((a, b) => (RESOLUTION_RANK[b] ?? 0) - (RESOLUTION_RANK[a] ?? 0))[0];

    if (!allowed) {
      return {
        ...done(),
        blockedReason: `This preset renders at ${wantedResolution}, and your ${tierInfo.label} plan tops out at ${tierInfo.maxResolution}. Upgrade to run it.`,
      };
    }
    notes.push(`Rendered at ${allowed} on your plan instead of ${wantedResolution}.`);
    fitted.resolution = allowed;
  }

  const wantedSeconds = presetDurationSeconds(fitted);
  // -1 is Seedance 2.5's "let the model choose" sentinel, not a length.
  if (wantedSeconds !== undefined && wantedSeconds > 0 && wantedSeconds > tierInfo.maxDurationSeconds) {
    const rule = presetDurationRule(preset.model);

    if (rule?.kind === "range") {
      const capped = Math.floor(tierInfo.maxDurationSeconds);
      if (capped < rule.min) {
        return {
          ...done(),
          blockedReason: `Your plan caps clips at ${tierInfo.maxDurationSeconds}s, under this model's ${rule.min}s minimum.`,
        };
      }
      notes.push(`Trimmed to ${capped}s on your plan — upgrade for the full ${wantedSeconds}s.`);
      fitted.duration = capped;
    } else if (rule?.kind === "options") {
      const allowed = rule.values
        .filter((value) => {
          const seconds = presetDurationSeconds({ duration: value });
          return seconds !== undefined && seconds <= tierInfo.maxDurationSeconds;
        })
        .sort(
          (a, b) =>
            (presetDurationSeconds({ duration: b }) ?? 0) -
            (presetDurationSeconds({ duration: a }) ?? 0),
        )[0];

      if (allowed === undefined) {
        return {
          ...done(),
          blockedReason: `Your plan caps clips at ${tierInfo.maxDurationSeconds}s, and this model's shortest clip is longer than that.`,
        };
      }
      notes.push(`Trimmed to ${allowed} on your plan — upgrade for the full ${wantedSeconds}s.`);
      fitted.duration = allowed;
    }
  }

  return done();
}

/**
 * What running this preset costs, both stages included.
 *
 * A recipe with a character stage bills for two model calls — the image model
 * that redraws the upload, then the video model that animates the result. The
 * server charges for both (createGenerationJob's extraCredits), so a card
 * showing only the video half would quote a price the user is not charged.
 *
 * Mirrors the sum the /generations/preset handler computes. Same convention
 * as the rest of this file: authoritative on the server, previewed here.
 */
export function presetCredits(
  preset: Pick<Preset, "model" | "styleModel" | "styleParameters">,
  settings: { durationSeconds: number | undefined; resolution: string | undefined },
): number {
  const video = estimateVideoCredits(
    preset.model,
    settings.durationSeconds ?? 5,
    settings.resolution ?? "720p",
  );
  if (!preset.styleModel) return video;

  const params = preset.styleParameters ?? {};
  const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);
  const stage = estimateImageCredits(preset.styleModel, {
    // Same key precedence as the backend's imageSettingsFromParameters — each
    // image model spells its size field differently.
    size: str(params.size) ?? str(params.imageSize) ?? str(params.resolution),
    quality: str(params.quality),
  });
  return video + stage;
}
