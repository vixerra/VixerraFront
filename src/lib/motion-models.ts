// Motion-transfer models on the generate composer: a character image and a
// reference clip in, the character doing what the clip's person does out.
//
// DUPLICATED from aiVideo-backend/supabase/functions/api/lib/influencer-
// motion.ts (the entries with inComposer: true) — keep in sync. The API
// re-checks everything this describes; these are what the form shows and
// prices with, so a drift is a wrong quote or a refused submit, not a wrong
// charge.

export type MotionComposerModel = {
  id: string;
  label: string;
  provider: string;
  description: string;
  /** "move" keeps the image's scene; "replace" keeps the clip's. */
  kind: "move" | "replace";
  resolutions: readonly string[];
  /** Takes a text prompt. */
  prompt: boolean;
  /** Takes "match the video" / "match the photo" facing. */
  orientation: boolean;
  /** Largest clip (and image) the provider accepts, when it caps one. */
  maxBytes?: number;
};

/** kie.ai's bounds on the clip, shared by every model here: 3-30s, or at
 *  most 10s when the character keeps the photo's facing. */
export const MOTION_MIN_SECONDS = 3;
export const MOTION_MAX_SECONDS = { video: 30, image: 10 } as const;
export const MOTION_PROMPT_MAX_LENGTH = 2500;

const WAN_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const MOTION_COMPOSER_MODELS: readonly MotionComposerModel[] = [
  {
    id: "kling/2.6-motion-control",
    label: "Kling 2.6 Motion Control",
    provider: "Kling",
    description: "Copies a clip's movement onto your character, at the lower price",
    kind: "move",
    resolutions: ["720p", "1080p"],
    prompt: true,
    orientation: true,
  },
  {
    id: "kling/3.0-motion-control",
    label: "Kling 3.0 Motion Control",
    provider: "Kling",
    description: "Sharpest, most faithful copy of a clip's movement",
    kind: "move",
    resolutions: ["720p", "1080p"],
    prompt: true,
    orientation: true,
  },
  {
    id: "wan/2.2-animate-move",
    label: "Wan 2.2 Animate Move",
    provider: "Alibaba",
    description: "Animates your character with a clip's movement, in your image's scene",
    kind: "move",
    resolutions: ["480p", "720p"],
    prompt: false,
    orientation: false,
    maxBytes: WAN_MAX_FILE_BYTES,
  },
  {
    id: "wan/2.2-animate-replace",
    label: "Wan 2.2 Animate Replace",
    provider: "Alibaba",
    description: "Puts your character in place of the person in a clip, in the clip's scene",
    kind: "replace",
    resolutions: ["480p", "720p"],
    prompt: false,
    orientation: false,
    maxBytes: WAN_MAX_FILE_BYTES,
  },
];

export function getMotionComposerModel(id: string): MotionComposerModel | undefined {
  return MOTION_COMPOSER_MODELS.find((m) => m.id === id);
}
