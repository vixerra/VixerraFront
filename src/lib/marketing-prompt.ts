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
import type { CopyPolicy, MarketingKind, MarketingStyle } from "@/lib/marketing-styles";

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

/** Below this, trimming the subject does more damage than trimming the whole
 *  string, so the flat cut comes back. Unreachable with the current catalog
 *  (the longest tail leaves ~600 characters of room); it exists so a future
 *  style can't quietly reduce the brief to a stub. */
const MIN_SUBJECT_LENGTH = 200;

/**
 * What every frame of this kind owes a paying client, appended to every
 * generation.
 *
 * These are the defects that make an otherwise good result unusable rather
 * than merely imperfect — a warped bottle, a label that drifts between
 * frames, subtitles nobody asked for. Naming them costs a couple of hundred
 * characters and is the cheapest quality the studio can buy; leaving them
 * unsaid is what produces a beautiful image the marketer cannot run.
 */
const CRAFT: Record<MarketingKind, string> = {
  image:
    "Commercial advertising photography: physically accurate light and shadow, true-to-life materials, correct product geometry and undistorted proportions, clean unbroken edges, sharp focus on the hero, no duplicated or melted parts, no watermark.",
  video:
    "Commercial advertising film: the product and any person stay identical from the first frame to the last — no morphing, no drifting label, no extra fingers — with stable exposure and white balance, motion that respects real weight, and no subtitles, captions or watermark at any point.",
};

/**
 * The anti-gibberish clause, chosen by the style's `copy` policy.
 *
 * Both halves matter. "none" has to say more than "no text", because the one
 * thing that must keep its lettering is the product's own packaging. And
 * "supplied" has to give the model somewhere to go when the brief named no
 * copy at all — left to itself it fills the headline slot with confident
 * nonsense, which is the single most common reason an ad render gets thrown
 * away.
 */
const COPY_RULES: Record<CopyPolicy, string> = {
  none: "No text, lettering, logo, badge or watermark anywhere in the frame beyond the product's own packaging, which keeps its real wording exactly as it is.",
  supplied:
    "Set only the words that appear in the brief above, spelled exactly as written, in one or two clean type sizes; if the brief names no copy, leave the type areas empty rather than inventing a headline or filling them with letter-shaped marks.",
};

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
 * then the style's treatment, then the two rules that apply to every frame —
 * what may be written in it, and what counts as a usable result. Models weight
 * the front of a prompt most heavily, and the one thing a marketing shot
 * cannot get wrong is what it's of, so the subject leads and the look follows
 * it. The constraints go last on purpose: they are also the part a model is
 * most likely to drop, and the tail is the second-strongest position.
 */
export function buildMarketingPrompt(
  style: MarketingStyle,
  description: string,
  options: { kind: MarketingKind; reference: ReferenceUse },
): string {
  const { kind, reference } = options;
  const own = description.trim();

  const subject = own
    ? sentence(own).replace(/\s*\.?\s*$/, ".")
    : fallbackSubject(kind, reference);

  const tail: string[] = [];
  const note = referenceNote(kind, reference);
  if (note) tail.push(note);
  tail.push(`${sentence(style.direction)}.`);
  tail.push(COPY_RULES[style.copy]);
  tail.push(CRAFT[kind]);
  const suffix = tail.join(" ");

  // Trim the subject rather than the string. The description field takes
  // 1200 characters, enough that a thorough brief plus the tail overruns the
  // cap — and cutting from the end would drop the craft rules, then the copy
  // rule, then the style, then the sentence explaining what the attached
  // reference even is. Those are the parts with no second chance; a long
  // brief still says most of what it came to say in its first paragraph.
  const room = MAX_PROMPT_LENGTH - suffix.length - 1;
  if (subject.length <= room) return `${subject} ${suffix}`;
  if (room < MIN_SUBJECT_LENGTH) {
    return `${`${subject} ${suffix}`.slice(0, MAX_PROMPT_LENGTH - 1).trimEnd()}…`;
  }
  return `${subject.slice(0, room - 1).trimEnd()}… ${suffix}`;
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
