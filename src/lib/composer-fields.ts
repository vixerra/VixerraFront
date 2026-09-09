// How the generate composer decides what to put in its toolbar.
//
// The model registry (cloudflare-models.ts) describes every parameter each
// model accepts, and the composer used to render all of them as equals — so
// an output-format picker sat next to the resolution, and a 15-model catalog
// meant the pill row's contents changed shape completely between models. This
// ranks them instead: the decisions that change the result (and the price)
// lead the row, the rest follow it, and only the controls that can't be
// expressed as a pill fall through to the Settings panel.

import type { DynamicField } from "@/lib/cloudflare-models";

/**
 * Never rendered. The plan decides these, not the user.
 *
 * `watermark` is forced to true for the free tier server-side (see
 * aiVideo-backend's generations.ts) and false on every paid plan, so a toggle
 * here is a control that either lies or does nothing. Hiding it does not drop
 * the value: registry fields carrying a defaultValue are defaulted by the zod
 * schema on both sides, so omitting the key sends exactly what the visible
 * toggle would have sent.
 */
export const TIER_MANAGED_FIELD_KEYS: ReadonlySet<string> = new Set(["watermark"]);

/**
 * Never rendered either, and pinned on for every model that accepts it.
 *
 * `useVirtualAvatar` routes character references through ByteDance's trusted
 * avatar library instead of its face/deepfake detector, so it only ever
 * unblocks a generation. Left as a switch it was a piece of provider trivia
 * that cost someone a rejected clip to learn. The registry defaults it to
 * true and the row is dropped — same mechanism as the tier-managed keys
 * above, so the value still ships.
 */
export const FORCED_ON_FIELD_KEYS: ReadonlySet<string> = new Set(["useVirtualAvatar"]);

/**
 * The three spellings providers use for one idea: how big the output is.
 * Recraft/OpenAI/ByteDance call it `size`, Google `imageSize`, xAI
 * `resolution`. The registry keeps each provider's own key (it mirrors the
 * wire), but the composer showed them as three different controls — "Size"
 * under one icon on one model, "Resolution" under another icon on the next —
 * for a setting the user experiences as the same choice, and which prices
 * identically (see imageSettingsFromParameters in credit-estimate.ts).
 */
export const SIZE_FIELD_KEYS: ReadonlySet<string> = new Set(["size", "imageSize", "resolution"]);

/**
 * Fields promoted to the front of the toolbar, in the order they appear
 * there. These are the choices that change the result and the price.
 */
export const PRIMARY_FIELD_KEYS = [
  "duration",
  "resolution",
  "imageSize",
  "size",
  "quality",
  "aspectRatio",
] as const;

/**
 * Real choices that follow the primaries rather than leading them — they
 * change the output without changing what it costs. They used to be
 * collapsed into the Settings panel purely because they weren't primary,
 * which buried a two-click format picker behind a popover while the row it
 * belonged in had room to spare.
 */
export const SECONDARY_FIELD_KEYS = ["fps", "outputFormat"] as const;

const PRIMARY_ORDER = new Map(PRIMARY_FIELD_KEYS.map((key, index) => [key as string, index]));
const SECONDARY_ORDER = new Map(
  SECONDARY_FIELD_KEYS.map((key, index) => [key as string, PRIMARY_ORDER.size + index]),
);

export function isPrimaryFieldKey(key: string): boolean {
  return PRIMARY_ORDER.has(key);
}

/** Sort comparator putting toolbar fields in PRIMARY then SECONDARY order. */
export function compareToolbarFieldKeys(a: string, b: string): number {
  const rank = (k: string) => PRIMARY_ORDER.get(k) ?? SECONDARY_ORDER.get(k) ?? Number.MAX_SAFE_INTEGER;
  return rank(a) - rank(b);
}

/**
 * The values a field can offer as a picker — its probed enum, or the
 * UI-only shortlist a free-text field carries (see `suggestedValues` in
 * cloudflare-models.ts).
 */
export function choicesFor(field: DynamicField): readonly string[] {
  if (field.type === "select") return field.options ?? [];
  return field.suggestedValues ?? [];
}

export type FieldPlacement = "toolbar" | "panel" | "hidden";

/**
 * Where a field belongs in the composer.
 *
 * - `hidden` — the plan owns it, it is pinned on app-wide, or it offers no
 *   actual choice. A one-option
 *   select is not a decision, and rendering a dropdown that can only be set
 *   to what it already is costs a slot in the row and teaches nothing. The
 *   value still ships: the zod schema defaults it on both sides.
 * - `toolbar` — anything expressible as a pill: a multi-choice list, or the
 *   numeric duration range the slider pill handles.
 * - `panel` — what a pill genuinely can't carry: switches, open numbers
 *   (seed, image count) and open text (negative prompt, Recraft's style).
 */
export function fieldPlacement(field: DynamicField, durationSliderKey?: string): FieldPlacement {
  if (TIER_MANAGED_FIELD_KEYS.has(field.key)) return "hidden";
  if (FORCED_ON_FIELD_KEYS.has(field.key)) return "hidden";
  if (field.key === durationSliderKey) return "toolbar";
  const choices = choicesFor(field);
  if (choices.length > 0) return choices.length > 1 ? "toolbar" : "hidden";
  // A select that somehow arrived with no options at all can't render either.
  if (field.type === "select") return "hidden";
  return "panel";
}

/**
 * What to call a field in the composer. The registry keeps the provider's own
 * label because it mirrors the wire; this is the user-facing one, which
 * normalises the size/resolution trio onto a single name so the same choice
 * doesn't get two names across two models.
 */
export function composerFieldLabel(field: DynamicField, isImageModel: boolean): string {
  if (isImageModel && SIZE_FIELD_KEYS.has(field.key)) return "Resolution";
  return field.label;
}

/**
 * Plain-language hint shown beside a raw enum value in a select.
 *
 * The registry's values are the provider's own spellings, verified live
 * against each model, and they are not interchangeable or even consistent
 * between models ("720P" vs "720p", "hd" vs "fhd"). They stay untouched in the
 * payload — this only annotates them in the list, so picking a resolution
 * doesn't require knowing that "fhd" means 1080p.
 */
const VALUE_HINTS: Record<string, string> = {
  // Video resolutions.
  "480p": "SD",
  "540p": "SD+",
  "720p": "HD",
  "768p": "HD+",
  "1080p": "Full HD",
  "4k": "Ultra HD",
  hd: "HD",
  fhd: "Full HD",
  // Image sizes. xAI spells its two tiers in lowercase, ByteDance in upper -
  // both are the provider's own spelling and neither is interchangeable.
  "1k": "~1024px",
  "2k": "~2048px",
  "1K": "~1024px",
  "2K": "~2048px",
  "3K": "~3072px",
  "4K": "~4096px",
  "512x512": "Square, fastest",
  "768x768": "Square",
  "1024x1024": "Square, 1K",
  "1024x1536": "Portrait",
  "1536x1024": "Landscape",
  "1536x1536": "Square, largest",
  "2048x2048": "Square, 2K",
  // Quality / effort.
  low: "Fastest",
  medium: "Balanced",
  high: "Best quality",
  auto: "Model decides",
  // Output formats.
  mp4: "Video",
  mov: "Video, ProRes-friendly",
  png: "Lossless",
  jpg: "Smaller file",
  jpeg: "Smaller file",
  webp: "Smallest file",
  // Frame rates.
  "24": "Cinematic",
  "48": "Extra smooth",
  // Aspect ratios worth naming.
  "16:9": "Landscape",
  "9:16": "Vertical",
  "1:1": "Square",
  "21:9": "Cinematic",
  "4:3": "Classic",
  "3:4": "Portrait",
  "4:5": "Portrait",
  "3:2": "Photo",
  "2:3": "Photo, portrait",
  "9:21": "Ultra vertical",
  "2:1": "Wide",
  "1:2": "Tall",
  "9:19.5": "Phone",
  "19.5:9": "Phone, landscape",
  "9:20": "Tall phone",
  "20:9": "Tall phone, landscape",
  "5:4": "Landscape",
  adaptive: "Match the reference",
  match_input_image: "Match the reference",
};

export function valueHint(value: string | number): string | undefined {
  return VALUE_HINTS[String(value)];
}
