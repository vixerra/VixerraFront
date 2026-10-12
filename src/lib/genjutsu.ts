/**
 * Vixlens Genjutsu: recast an existing clip from reference images, in one of
 * two modes. Mirrors aiVideo-backend's lib/genjutsu.ts, which builds the
 * prompt and runs it; this side only collects the inputs and prices them.
 *
 * Sold as a feature of its own: no provider or model name belongs anywhere
 * on its page.
 */

import type { LucideIcon } from "lucide-react";
import { Box, MapPin, Move, Package, Replace, Shirt, User } from "lucide-react";

/** The feature's name, wherever it is shown. One place to change it. */
export const GENJUTSU_NAME = "Vixlens Genjutsu";
/** The model a Genjutsu run is stored and priced as. */
export const GENJUTSU_MODEL_ID = "vixlens/genjutsu";

export const GENJUTSU_MAX_REFERENCES = 10;
export const GENJUTSU_MIN_SECONDS = 3;
export const GENJUTSU_MAX_SECONDS = 15;
export const GENJUTSU_NOTE_MAX = 200;
export const GENJUTSU_PROMPT_MAX = 1000;
export const GENJUTSU_RESOLUTIONS = ["480p", "720p", "1080p"] as const;

export type GenjutsuMode = "swap" | "motion";
export type GenjutsuReferenceKind = "character" | "product" | "outfit" | "location" | "object";

export const GENJUTSU_MODES: { id: GenjutsuMode; title: string; body: string; icon: LucideIcon }[] = [
  {
    id: "swap",
    title: "Object Swap",
    body: "Change a person, product, outfit or place. The rest of the shot stays as filmed.",
    icon: Replace,
  },
  {
    id: "motion",
    title: "Motion Transfer",
    body: "Keep the clip's motion, camera and timing. Rebuild the scene from your references.",
    icon: Move,
  },
];

/** Each kind of reference, with the hint its note field shows in each mode. */
export const GENJUTSU_KINDS: {
  id: GenjutsuReferenceKind;
  label: string;
  icon: LucideIcon;
  placeholder: Record<GenjutsuMode, string>;
}[] = [
  {
    id: "character",
    label: "Character",
    icon: User,
    placeholder: { swap: "Replaces… e.g. the woman on the left", motion: "Performs… e.g. the dancer's moves" },
  },
  {
    id: "product",
    label: "Product",
    icon: Package,
    placeholder: { swap: "Replaces… e.g. the bag she carries", motion: "Appears as… e.g. the drink she holds" },
  },
  {
    id: "outfit",
    label: "Outfit",
    icon: Shirt,
    placeholder: { swap: "Worn by… e.g. the dancer", motion: "Worn by… e.g. the dancer" },
  },
  {
    id: "location",
    label: "Location",
    icon: MapPin,
    placeholder: { swap: "Replaces… e.g. the background", motion: "Optional, e.g. a rooftop at night" },
  },
  {
    id: "object",
    label: "Object",
    icon: Box,
    placeholder: { swap: "Replaces… e.g. the coffee cup", motion: "Appears as… e.g. the ball" },
  },
];

export function genjutsuKind(id: GenjutsuReferenceKind) {
  return GENJUTSU_KINDS.find((k) => k.id === id) ?? GENJUTSU_KINDS[0];
}
