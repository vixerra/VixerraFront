// Shapes for the AI influencer builder (src/components/influencer). The
// trait catalogue itself is NOT duplicated here: the API owns it (see
// aiVideo-backend's lib/influencer-traits.ts) and serves it from
// GET /influencers/options, because the server compiles the prompt from the
// option ids this page posts back. Only presentation lives on this side.
import {
  Accessibility,
  Brush,
  Drama,
  Laugh,
  Eye,
  Footprints,
  Glasses,
  Globe2,
  Hourglass,
  Palette,
  Ruler,
  ScanFace,
  Scissors,
  Shirt,
  Smile,
  Sparkles,
  Star,
  User,
  UserRound,
  VenusAndMars,
  type LucideIcon,
} from "lucide-react";

export type TraitOption = { id: string; label: string; swatch?: string };
export type TraitGroup = { id: string; label: string; multi?: number; options: TraitOption[] };

/** "move": the portrait is animated in its own scene (Kling). "replace": the
 *  influencer takes the clip's person's place, in the clip's scene (Wan). */
export type MotionKind = "move" | "replace";

/** Everything past `background` is optional: an API older than "replace"
 *  doesn't send it, and the page then treats every model as Kling-shaped. */
export type MotionModelOption = {
  id: string;
  label: string;
  description: string;
  background: boolean;
  kind?: MotionKind;
  resolutions?: string[];
  prompt?: boolean;
  orientation?: boolean;
  maxVideoBytes?: number | null;
  /** The model the run is priced as ("replace" bills as Seedance 2.5). */
  billingModel?: string;
  minSeconds?: number;
  /** Per-frame pixel bounds for the clip; a clip outside them is re-encoded
   *  in the browser before it is sent (lib/downscale-video.ts). */
  videoPixels?: { min: number; max: number } | null;
};

export type InfluencerOptions = {
  groups: TraitGroup[];
  detailsMaxLength: number;
  portrait: {
    model: string;
    aspectRatios: string[];
    /** Only ever ["2K"] now: the API renders every portrait at 2K. */
    imageSizes: string[];
    defaults: { aspectRatio: string; imageSize: string };
    /** This user hasn't had an influencer portrait yet, so the next one is
     *  free. Optional so a page ahead of the API still prices normally. */
    firstFree?: boolean;
  };
  motion: {
    models: MotionModelOption[];
    resolutions: string[];
    orientations: ("video" | "image")[];
    minSeconds: number;
    maxSeconds: Record<"video" | "image", number>;
    promptMaxLength: number;
  };
};

/** The subset of a serialized generation this page reads. */
export type InfluencerGeneration = {
  id: string;
  type: string;
  model: string;
  status: string;
  progressPercent: number;
  resultUrl: string | null;
  thumbnailUrl: string | null;
  inputImageUrl: string | null;
  costCredits: number;
  errorMessage: string | null;
  parameters: Record<string, unknown>;
  createdAt: string;
};

export type Influencer = {
  id: string;
  name: string;
  traits: Record<string, string | string[]>;
  details: string | null;
  organizationId: string | null;
  portrait: InfluencerGeneration | null;
  motionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type InfluencerDetail = Influencer & { generations: InfluencerGeneration[] };

/** Picks keyed by group id: one option id, or several for a multi group. */
export type TraitPicks = Record<string, string | string[]>;

export function pickCount(picks: TraitPicks, groupId: string): number {
  const value = picks[groupId];
  if (Array.isArray(value)) return value.length;
  return value ? 1 : 0;
}

export function isPicked(picks: TraitPicks, groupId: string, optionId: string): boolean {
  const value = picks[groupId];
  return Array.isArray(value) ? value.includes(optionId) : value === optionId;
}

/** Toggling a pick: a single group swaps (or clears on a second click), a
 *  multi group adds or removes and ignores a click past its cap. */
export function togglePick(picks: TraitPicks, group: TraitGroup, optionId: string): TraitPicks {
  const next = { ...picks };
  if (group.multi) {
    const current = Array.isArray(next[group.id]) ? (next[group.id] as string[]) : [];
    if (current.includes(optionId)) next[group.id] = current.filter((id) => id !== optionId);
    else if (current.length < group.multi) next[group.id] = [...current, optionId];
    if ((next[group.id] as string[]).length === 0) delete next[group.id];
  } else if (next[group.id] === optionId) {
    delete next[group.id];
  } else {
    next[group.id] = optionId;
  }
  return next;
}

/** One icon per section header. Unknown groups (added server-side later)
 *  fall back to a sparkle rather than breaking the panel. */
const GROUP_ICONS: Record<string, LucideIcon> = {
  characterType: UserRound,
  comicLevel: Laugh,
  gender: VenusAndMars,
  age: Hourglass,
  ethnicity: Globe2,
  skinColor: Palette,
  build: Accessibility,
  height: Ruler,
  proportions: Footprints,
  hairstyle: Scissors,
  hairColor: Brush,
  headShape: ScanFace,
  eyeShape: Eye,
  eyeColor: Eye,
  features: Smile,
  facialHair: User,
  neck: User,
  distinctive: Star,
  expression: Drama,
  style: Shirt,
  accessories: Glasses,
};

export function groupIcon(groupId: string): LucideIcon {
  return GROUP_ICONS[groupId] ?? Sparkles;
}

/** Groups shown open on first load: the ones that change the character
 *  most. Everything else starts collapsed, so the panel isn't a wall. */
export const OPEN_BY_DEFAULT = new Set(["characterType", "comicLevel", "gender", "hairstyle", "hairColor", "style"]);

/** Labels for the motion-transfer models, which aren't in VIDEO_MODELS (only
 *  the influencer page runs them; see aiVideo-backend's
 *  lib/influencer-motion.ts). Read by the gallery so a clip doesn't show a
 *  raw model id — nor the provider's name: the studio sells "Low", "High"
 *  and "Replace", not the models behind them. */
export const MOTION_MODEL_LABELS: Record<string, string> = {
  "kling/2.6-motion-control": "AI influencer motion · Low",
  "kling/3.0-motion-control": "AI influencer motion · High",
  "wan/2.2-animate-replace": "AI influencer motion · Replace",
};

const REPLACE_LABEL = "AI influencer motion · Replace";

/**
 * What to call an influencer motion clip wherever its model is shown, or
 * null for anything else (a portrait, an ordinary generation), which keeps
 * its usual label. A "Replace" run is stored as a plain Seedance 2.5
 * generation, so it is told apart by the `kind` its route saved.
 */
export function influencerModelLabel(
  model: string,
  parameters?: Record<string, unknown> | null,
): string | null {
  if (parameters?.kind === "replace") return REPLACE_LABEL;
  return MOTION_MODEL_LABELS[model] ?? null;
}

/** Parameters an influencer run saves for its own bookkeeping, which the
 *  gallery's details list has no business showing ("Kind: replace",
 *  "Portrait Generation Id: <uuid>"). */
export const INFLUENCER_INTERNAL_PARAMS = [
  "kind",
  "influencer",
  "portraitGenerationId",
  "measuredDuration",
  "layout",
  "firstPortraitFree",
  "background",
] as const;

/** A portrait made as a two-panel character sheet (close-up left, full body
 *  right). Motion animates only its right half; see lib/influencer-crop.ts. */
export function isCharacterSheet(generation: InfluencerGeneration | null | undefined): boolean {
  return generation?.parameters.layout === "sheet";
}

export function isActive(status: string): boolean {
  return status === "pending" || status === "queued" || status === "processing";
}
