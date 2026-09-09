// Turns what you typed in the Marketing Studio, plus the picked style, into
// the single string that actually gets submitted.
//
// You write the subject — what's being sold, who's in it, what it should say.
// The style contributes its treatment, and the reference note explains how the
// attached image must be read. All three are prompt text on purpose: the
// backend builds a generation's parameters strictly from the model registry,
// so none of this has a structured field to travel in — the same constraint
// image-styles.ts documents for its style presets. The one thing that IS
// structured is the reference image, and even that is a single slot
// (`inputImageUrl`), which is why the sheet note below has to exist at all.

import { PROMPT_MAX_LENGTH } from "@/lib/constants";
import type { MarketingKind, MarketingStyle } from "@/lib/marketing-styles";

/**
 * Which uploaded asset travels as the model's one reference image.
 *
 * `sheet` is the two-in-one case: product and talent composited side by side
 * into a single image (see reference-sheet.ts) because a generation carries
 * exactly one input image and the studio's whole premise needs two. It is
 * offered for image models only — on a video model the reference is the
 * opening frame, so a side-by-side sheet would literally be animated.
 */
export type ReferenceUse = "none" | "product" | "talent" | "sheet";

/** Hard cap on what we submit. Kept a margin under the schema's own cap
 *  (see buildDynamicSchema) so a long description gets trimmed here, with an
 *  ellipsis, rather than turning into a validation error at submit time. */
const MAX_PROMPT_LENGTH = PROMPT_MAX_LENGTH - 100;

function referenceNote(kind: MarketingKind, reference: ReferenceUse): string | undefined {
  if (reference === "none") return undefined;

  if (reference === "sheet") {
    return (
      "The attached reference is a two-panel identity sheet: the LEFT panel is the product, " +
      "the RIGHT panel is the person. Reproduce both faithfully — the product's exact shape, " +
      "proportions, label text and colours, and the person's face, hair and build — together in " +
      "one new scene. Do not reproduce the sheet itself: no split layout, no divider, no white " +
      "panel background."
    );
  }

  // Written out per kind rather than interpolated from one shared fragment:
  // the traits clause ends the sentence in the image phrasing and sits
  // mid-sentence in the video one, and sharing it produced a run-on
  // ("…label text and colours consistent for the whole clip").
  if (kind === "video") {
    return reference === "product"
      ? "The attached image is the opening frame. Keep the product exactly as it is for the whole clip — same shape, proportions, label text and colours, no drift."
      : "The attached image is the opening frame. Keep the person exactly as they are for the whole clip — same face, hair and build, no drift.";
  }

  return reference === "product"
    ? "Keep the product in the attached reference exactly as it is — same shape, proportions, label text and colours."
    : "Keep the person in the attached reference exactly as they are — same face, hair and build.";
}

/**
 * The lead sentence when nothing was typed. Only reachable with an asset
 * attached (see promptBlockedReason) — a style plus a photo is a complete
 * enough request, and inventing a subject line for it beats submitting one
 * that opens on the style's treatment with no subject at all.
 */
function fallbackSubject(kind: MarketingKind, reference: ReferenceUse): string {
  const noun = kind === "video" ? "Advertising video" : "Advertising image";
  return reference === "talent"
    ? `${noun} featuring the person in the reference image.`
    : `${noun} for the product in the reference image.`;
}

/** The catalog writes its directions as fragments ("studio product
 *  photography on a seamless backdrop, …") so they can also be read on a
 *  style card. Each one still lands mid-prompt as its own sentence. */
function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * The exact text submitted as `prompt`.
 *
 * Order matters: your own words first, then how the reference must be treated,
 * then the style's treatment. Models weight the front of a prompt most
 * heavily, and the one thing a marketing shot cannot get wrong is what it's
 * of — so the subject leads and the look follows it.
 */
export function buildMarketingPrompt(
  style: MarketingStyle,
  description: string,
  options: { kind: MarketingKind; reference: ReferenceUse },
): string {
  const { kind, reference } = options;
  const own = description.trim();

  const parts: string[] = [
    own ? sentence(own).replace(/\s*\.?\s*$/, ".") : fallbackSubject(kind, reference),
  ];

  const note = referenceNote(kind, reference);
  if (note) parts.push(note);

  parts.push(`${sentence(style.direction)}.`);

  const prompt = parts.join(" ");
  return prompt.length > MAX_PROMPT_LENGTH
    ? `${prompt.slice(0, MAX_PROMPT_LENGTH - 1).trimEnd()}…`
    : prompt;
}

/** Whether there is enough here to be worth spending credits on. A style
 *  describes treatment, never subject — running one with nothing typed and
 *  nothing attached produces a beautiful photo of nothing in particular, at
 *  full price. */
export function promptBlockedReason(
  description: string,
  reference: ReferenceUse,
): string | undefined {
  if (description.trim() || reference !== "none") return undefined;
  return "Describe what you're selling, or attach a product photo.";
}
