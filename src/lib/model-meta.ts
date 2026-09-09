// Structured "spec badges" (max duration, max resolution, ...) for the model
// picker dropdown — derived from data this app already has, never invented:
//   - Seedance 2.5/2.0: their own SEEDANCE*_DURATION_MAX/RESOLUTIONS constants.
//   - Live Cloudflare-registry models: the same `duration`/`resolution`/`size`
//     field definitions that already drive their generation form (see
//     cloudflare-models.ts) — the max of a field's `options`, or its `max`.
// Everything else falls back to no badges — callers should show the plain
// description instead rather than a fabricated spec.

import { Clock, Monitor } from "lucide-react";
import { getCloudflareModel } from "@/lib/cloudflare-models";
import {
  SEEDANCE_MODEL_ID,
  SEEDANCE_DURATION_MAX,
  SEEDANCE_RESOLUTIONS,
  SEEDANCE2_MODEL_ID,
  SEEDANCE2_DURATION_MAX,
  SEEDANCE2_RESOLUTIONS,
} from "@/lib/constants";

export type ModelBadge = { icon: typeof Clock; label: string };

const RESOLUTION_RANK: Record<string, number> = {
  "480p": 1,
  "540p": 1,
  "720p": 2,
  "1024x1024": 2,
  "1080p": 3,
  "2k": 3,
  "2048x2048": 3,
  "4k": 4,
};

function bestResolution(options: readonly string[]): string {
  const best = [...options].sort(
    (a, b) => (RESOLUTION_RANK[a.toLowerCase()] ?? 0) - (RESOLUTION_RANK[b.toLowerCase()] ?? 0),
  ).at(-1);
  return best === "4k" ? "4K" : (best ?? options[0]);
}

export function getModelBadges(modelId: string): ModelBadge[] {
  if (modelId === SEEDANCE_MODEL_ID) {
    return [
      { icon: Clock, label: `Up to ${SEEDANCE_DURATION_MAX}s` },
      { icon: Monitor, label: `${bestResolution(SEEDANCE_RESOLUTIONS)} max` },
    ];
  }
  if (modelId === SEEDANCE2_MODEL_ID) {
    return [
      { icon: Clock, label: `Up to ${SEEDANCE2_DURATION_MAX}s` },
      { icon: Monitor, label: `${bestResolution(SEEDANCE2_RESOLUTIONS)} max` },
    ];
  }

  const config = getCloudflareModel(modelId);
  if (config) {
    const badges: ModelBadge[] = [];
    const durationField = config.fields.find(
      (f) => f.key === "duration" && f.type === "number" && f.max !== undefined,
    );
    if (durationField?.max !== undefined) {
      badges.push({ icon: Clock, label: `Up to ${durationField.max}s` });
    }
    const resolutionField = config.fields.find((f) => f.key === "resolution" || f.key === "size");
    if (resolutionField?.type === "select" && resolutionField.options?.length) {
      badges.push({ icon: Monitor, label: `${bestResolution(resolutionField.options)} max` });
    } else if (resolutionField?.defaultValue) {
      badges.push({ icon: Monitor, label: String(resolutionField.defaultValue) });
    }
    return badges;
  }

  return [];
}
