// The Marketing Studio's style catalog — the "Choose style" library behind
// /studio (see src/components/studio/style-picker.tsx).
//
// A style is NOT a model parameter, for exactly the reason image-styles.ts
// spells out: the backend builds a generation's parameters strictly from the
// model registry (cloudflare-models.ts), so an invented `style` key would be
// dropped or rejected, and it would mean something different on each model
// anyway. A style here is four things the studio owns entirely:
//
//   1. `direction` — a medium/treatment/composition fragment folded into the
//      prompt (never subject matter; the brief supplies that).
//   2. `copy` — whether the frame carries words at all, which decides the
//      anti-gibberish sentence marketing-prompt.ts appends.
//   3. `model` + `aspect` — the sensible default pairing for that look, both
//      still overridable in the composer.
//   4. `thumbnail`, or `motif` + `palette` — what its card shows in the
//      picker. A style with rendered art points at it; one without draws a
//      CSS/SVG tile from its motif and palette instead, so a new style is
//      still a one-object edit and ships looking finished before anyone
//      generates a sample for it.

export type MarketingKind = "image" | "video";

export type MarketingCategoryId =
  | "product-shot"
  | "ads"
  | "marketplace"
  | "ugc"
  | "motion";

export type MarketingCategory = {
  id: MarketingCategoryId;
  label: string;
  kind: MarketingKind;
  blurb: string;
};

/** Grouped Image-then-Video in the picker's left rail, in this order. */
export const MARKETING_CATEGORIES: MarketingCategory[] = [
  {
    id: "product-shot",
    label: "Product shot",
    kind: "image",
    blurb: "Studio-grade stills of the product itself.",
  },
  {
    id: "ads",
    label: "Ads",
    kind: "image",
    blurb: "Key visuals built around a claim, an offer or a headline.",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    kind: "image",
    blurb: "Listing images that pass Amazon/Shopify-style requirements.",
  },
  {
    id: "ugc",
    label: "UGC",
    kind: "video",
    blurb: "Creator-style clips that look filmed on a phone.",
  },
  {
    id: "motion",
    label: "Motion",
    kind: "video",
    blurb: "Designed motion: the product as the hero of a spot.",
  },
];

/** Which abstract tile the picker draws for a style — see style-preview.tsx. */
export type StyleMotif =
  | "object"
  | "pedestal"
  | "splash"
  | "burst"
  | "type"
  | "grid"
  | "portrait"
  | "split"
  | "phone"
  | "orbit";

/**
 * Whether the frame is supposed to carry words at all.
 *
 * The most common way an otherwise good generation becomes unusable as an ad
 * is invented type: a headline of confident gibberish, a fake logo, a
 * watermark, or — on video — burned-in subtitles nobody asked for. One
 * blanket "no text" rule can't fix that, because half this catalog exists to
 * carry a headline. A packshot wants no words at all; a headline ad wants
 * exactly the words that were typed and not one more. marketing-prompt.ts
 * turns this field into the matching instruction at submit time.
 */
export type CopyPolicy = "none" | "supplied";

export type MarketingStyle = {
  id: string;
  name: string;
  category: MarketingCategoryId;
  /** One line under the name in the picker. */
  blurb: string;
  /** Extra search terms, so "instagram" or "amazon" find the right tiles. */
  keywords: readonly string[];
  motif: StyleMotif;
  /** [from, to] of the tile's gradient. Raw hex — these are illustration
   *  colors for the preview art, not app chrome, so they deliberately sit
   *  outside the theme tokens in globals.css.
   *
   *  Still required with a `thumbnail` set: it is what the card falls back to
   *  while the image loads, and what a future style gets before its art
   *  exists. */
  palette: readonly [string, string];
  /** A rendered sample under /public, shown instead of the drawn motif.
   *
   *  The motif tiles were built because the catalog shipped no art and every
   *  sample we could have shipped would either be someone else's work or a
   *  claim the catalog couldn't back. These are neither: each one is a
   *  generation from this studio, off the prompt recorded for it in
   *  docs/marketing-style-thumbnails.md, on an unbranded stand-in product.
   *
   *  On a video style this must be the clip's own first frame, not a
   *  separate render: hover restarts the loop at 0 and fades it in over the
   *  still, so a matching frame makes that seamless and anything else turns
   *  it into a crossfade between two different pictures. */
  thumbnail?: string;
  /** A short muted loop under /public that plays over the tile while it is
   *  hovered or focused — video styles only, where a still can't show the
   *  one thing that sets them apart. Never fetched until then: the picker
   *  can have seven of these on screen at once. See StylePreview. */
  video?: string;
  /** Folded into the prompt on submit. Treatment and composition only.
   *
   *  Written as a photographer's or director's brief rather than as a mood:
   *  how the light is shaped, lens and camera height, surface and backdrop,
   *  where the hero sits in the frame, color, finish. Adjectives a model
   *  can't act on ("professional", "high quality", "stunning") move nothing
   *  — the specifics do, and they are what separates a render that looks
   *  like stock from one that can actually run as an ad. */
  direction: string;
  /** Whether this look carries type. See CopyPolicy. */
  copy: CopyPolicy;
  /** Applied when the chosen model offers it, otherwise the model's own
   *  default stands — the registry's aspect enums genuinely differ.
   *
   *  4:5 is the paid-social feed ratio: the tallest crop Meta will render in
   *  feed, so it buys the most screen per impression. Only Nano Banana Pro
   *  lists it, which is fine because every image style runs there — but that
   *  also makes it image-only, so no video style may use it. */
  aspect: "1:1" | "4:5" | "3:4" | "16:9" | "9:16";
  /** Default model for this look. Must be a studio model of the category's
   *  kind (see marketing-models.ts) — resolveStyleModel falls back to the
   *  first model of that kind if it isn't. */
  model: string;
};

// Every image style runs on Nano Banana Pro. It is not a taste call: the two
// cheaper ByteDance image models accept a reference image and then ignore it
// (see cloudflare-models.ts), which makes them useless to a studio built on
// "keep my product and my talent". Nano Banana Pro reproduces a reference
// faithfully, and is what the styles that used to open on Seedream 4.5 now
// point at.
const NANO_BANANA = "google/nano-banana-pro";
const VEO_FAST = "google/veo-3.1-fast";
const SEEDANCE_MINI = "bytedance/seedance-2.0-mini";

export const MARKETING_STYLES: MarketingStyle[] = [
  // ---------- Product shot ----------
  {
    id: "studio-seamless",
    name: "Studio Seamless",
    category: "product-shot",
    blurb: "Soft-box lighting on an infinite backdrop.",
    keywords: ["clean", "packshot", "catalog", "white", "hero"],
    motif: "object",
    palette: ["#e9e4dc", "#b8b0a4"],
    thumbnail: "/marketing/studio-seamless.webp",
    direction:
      "studio packshot on a seamless sweep, a large soft key at 45 degrees with a fill card lifting the shadow side and a top rim separating the product from the background, smooth gradient falloff behind it, a soft contact shadow anchoring it to the surface, 85mm look with the whole product sharp, hero centered with generous even margins and nothing in frame competing with it",
    copy: "none",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "stone-pedestal",
    name: "Stone Pedestal",
    category: "product-shot",
    blurb: "Editorial still life on an architectural set.",
    keywords: ["marble", "plinth", "editorial", "luxury", "minimal"],
    motif: "pedestal",
    palette: ["#d8cfc2", "#8d8478"],
    thumbnail: "/marketing/stone-pedestal.webp",
    direction:
      "editorial still life, the product raised on a stone plinth in a minimal architectural set, hard directional sunlight raking across it, long soft-edged shadows with a warm bounce filling the shade, travertine and plaster texture, warm neutral palette, low three-quarter camera looking slightly up so the product reads monumental, generous air above it",
    copy: "none",
    aspect: "3:4",
    model: NANO_BANANA,
  },
  {
    id: "splash-freeze",
    name: "Splash & Freeze",
    category: "product-shot",
    blurb: "Liquid frozen mid-air around the product.",
    keywords: ["water", "drink", "splash", "macro", "fresh"],
    motif: "splash",
    palette: ["#7fd4e8", "#1c6f92"],
    thumbnail: "/marketing/splash-freeze.webp",
    direction:
      "high-speed flash photography, a liquid splash frozen mid-air around the product, crystalline droplets suspended with clean rims, a wet reflective surface below, hard backlight making the liquid glow, ultra-crisp macro detail and deep saturated color, the product itself perfectly still and razor-sharp at the center of the motion",
    copy: "none",
    aspect: "3:4",
    model: NANO_BANANA,
  },
  {
    id: "natural-set",
    name: "Natural Set",
    category: "product-shot",
    blurb: "Raw stone, linen and dappled daylight.",
    keywords: ["organic", "clean beauty", "earthy", "botanical", "skincare"],
    motif: "object",
    palette: ["#cfd7c2", "#6f7a5c"],
    thumbnail: "/marketing/natural-set.webp",
    direction:
      "the product staged on natural materials — raw stone, crumpled linen, fresh foliage — dappled daylight through leaves drawing organic shadow shapes, soft directional window light, a calm earthy palette of sand, clay and sage, shallow depth of field with the label crisp and the props falling off, quiet unstyled realism",
    copy: "none",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "dark-luxe",
    name: "Dark Luxe",
    category: "product-shot",
    blurb: "Low-key rim light on black glass.",
    keywords: ["premium", "black", "perfume", "moody", "dramatic"],
    motif: "object",
    palette: ["#3a3a42", "#0c0c10"],
    thumbnail: "/marketing/dark-luxe.webp",
    direction:
      "low-key studio lighting on a black glossy surface, one hard rim light tracing the silhouette and a soft edge kick on the opposite side, deep falloff into near-black, controlled specular highlights on glass and metal, a mirrored reflection under the product, restrained composition with the hero held small inside a large dark frame",
    copy: "none",
    aspect: "3:4",
    model: NANO_BANANA,
  },
  {
    id: "gradient-pop",
    name: "Gradient Pop",
    category: "product-shot",
    blurb: "Duotone backdrop, hard colored lights.",
    keywords: ["colorful", "bold", "playful", "duotone", "social"],
    motif: "object",
    palette: ["#ff8f5e", "#c026d3"],
    thumbnail: "/marketing/gradient-pop.webp",
    direction:
      "bold duotone gradient backdrop, hard colored studio lights throwing crisp overlapping shadow shapes, the product floating weightless in a playful composition, punchy saturated color, glossy highlights, high-key contrast, graphic and confident with plenty of flat color left around the hero",
    copy: "none",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "ingredient-burst",
    name: "Ingredient Burst",
    category: "product-shot",
    blurb: "Ingredients exploding around the hero.",
    keywords: ["food", "supplement", "explosion", "energy", "fresh"],
    motif: "splash",
    palette: ["#ffd166", "#e2662b"],
    thumbnail: "/marketing/ingredient-burst.webp",
    direction:
      "the product at the center of its own ingredients bursting outward in mid-air, motion frozen at high shutter speed with every element crisp and individually readable, a bright even key with a soft top light, clean single-color backdrop, weightless radial arrangement with the hero upright, dominant and unobscured",
    copy: "none",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "flat-lay",
    name: "Flat Lay",
    category: "product-shot",
    blurb: "Top-down, styled, plenty of air.",
    keywords: ["overhead", "top down", "styled", "lifestyle", "grid"],
    motif: "grid",
    palette: ["#e7dfd4", "#a99e8c"],
    thumbnail: "/marketing/flat-lay.webp",
    direction:
      "top-down flat lay on a textured surface, props styled on an invisible grid with even spacing, soft diffuse daylight with consistent shadows all falling the same way, a muted cohesive palette, camera perfectly square-on with no perspective skew, generous negative space left open for copy",
    copy: "none",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "in-hand",
    name: "In Hand",
    category: "product-shot",
    blurb: "Held, worn, used — scale you can feel.",
    keywords: ["model", "on body", "holding", "scale", "human", "lifestyle"],
    motif: "portrait",
    palette: ["#e8c9b4", "#8c6a55"],
    thumbnail: "/marketing/in-hand.webp",
    direction:
      "the product held or worn by a person, cropped close on the hands or the point of contact, soft directional daylight with a gentle falloff, the product crisp and the person softly out of focus behind it, natural skin tone and unretouched texture, an unposed candid gesture that shows real scale, the label turned to camera and readable",
    copy: "none",
    aspect: "4:5",
    model: NANO_BANANA,
  },
  {
    id: "range-lineup",
    name: "Range Lineup",
    category: "product-shot",
    blurb: "The whole family in one frame.",
    keywords: ["range", "variants", "flavors", "collection", "family", "set"],
    motif: "grid",
    palette: ["#dcd8d2", "#7e7a72"],
    thumbnail: "/marketing/range-lineup.webp",
    direction:
      "the full product range lined up in a single row, evenly spaced and identically lit, matched height and one shared eye level across every unit, a soft studio key with a single consistent shadow direction, plain gradient backdrop, each front label square to camera and equally legible, no unit overlapping another",
    copy: "none",
    aspect: "16:9",
    model: NANO_BANANA,
  },

  // ---------- Ads ----------
  // The one group where type is the point, so every style here is
  // copy: "supplied": the headline is whatever the brief says, and an empty
  // type area beats an invented slogan.
  {
    id: "headline-hero",
    name: "Headline Hero",
    category: "ads",
    blurb: "Big type, one product, nothing else.",
    keywords: ["poster", "typography", "campaign", "key visual", "instagram"],
    motif: "type",
    palette: ["#bbdc12", "#1d2408"],
    thumbnail: "/marketing/headline-hero.webp",
    direction:
      "advertising key visual, a large bold headline locked to a clear typographic grid with the product hero beside it, a strong color-blocked background, dramatic single-source light on the product, a deliberate hierarchy of headline then product then one small supporting line, generous negative space around all three, poster-clean",
    copy: "supplied",
    aspect: "4:5",
    model: NANO_BANANA,
  },
  {
    id: "offer-burst",
    name: "Offer Burst",
    category: "ads",
    blurb: "Discount badge, radial burst, retail energy.",
    keywords: ["sale", "promo", "discount", "retail", "black friday"],
    motif: "burst",
    palette: ["#ff0052", "#ffd400"],
    thumbnail: "/marketing/offer-burst.webp",
    direction:
      "promotional retail layout, a bold discount badge over a radial burst behind the product, high-contrast sale colors, the product cut out crisply and floating in front of the burst with a soft drop shadow, loud but tidy, the offer and the product both readable in a one-second glance on a phone",
    copy: "supplied",
    aspect: "4:5",
    model: NANO_BANANA,
  },
  {
    id: "feature-callouts",
    name: "Feature Callouts",
    category: "ads",
    blurb: "Thin leader lines to short benefit labels.",
    keywords: ["benefits", "annotated", "spec", "tech", "explainer"],
    motif: "split",
    palette: ["#9fb8d8", "#243247"],
    thumbnail: "/marketing/feature-callouts.webp",
    direction:
      "clean advertising layout with hairline leader lines running from precise points on the product to short feature labels set in one small consistent sans, the product centered on a flat background under even studio light, labels balanced left and right, technical but elegant, plenty of empty space and no line crossing another",
    copy: "supplied",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "before-after",
    name: "Before / After",
    category: "ads",
    blurb: "Split frame, matched lighting, clear labels.",
    keywords: ["comparison", "results", "transformation", "proof"],
    motif: "split",
    palette: ["#8ad2b0", "#22553f"],
    thumbnail: "/marketing/before-after.webp",
    direction:
      "split-frame comparison divided by a crisp vertical line, identical framing, lens, lighting and background on both halves so the result is the only thing that differs, the change plainly visible, small labels in matching corners, honest documentary treatment with no exaggeration and no grading between the halves",
    copy: "supplied",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "testimonial-card",
    name: "Testimonial Card",
    category: "ads",
    blurb: "A face, a quote card, five stars.",
    keywords: ["review", "social proof", "quote", "stars", "ugc ad"],
    motif: "portrait",
    palette: ["#f2c3b1", "#8a4b3a"],
    thumbnail: "/marketing/testimonial-card.webp",
    direction:
      "social-proof ad: a portrait on one side, a short quote card and a row of five filled stars on the other, soft brand-tinted background, flattering natural light on the face with true skin tone, the product visible in frame at a smaller scale, clean card edges and comfortable margins",
    copy: "supplied",
    aspect: "4:5",
    model: NANO_BANANA,
  },
  {
    id: "story-frame",
    name: "Story Frame",
    category: "ads",
    blurb: "Full-bleed vertical for Stories and Reels.",
    keywords: ["story", "reels", "tiktok", "vertical", "paid social", "9:16"],
    motif: "type",
    palette: ["#ff7a45", "#2b1054"],
    thumbnail: "/marketing/story-frame.webp",
    direction:
      "full-bleed vertical ad frame, the product hero filling the upper two thirds, a short punchy headline above it and a clear call-to-action band low in the frame, high-contrast color, the top and bottom eighths kept clear of anything important so platform UI cannot cover it, thumb-stopping at a glance",
    copy: "supplied",
    aspect: "9:16",
    model: NANO_BANANA,
  },
  {
    id: "billboard",
    name: "Billboard",
    category: "ads",
    blurb: "Out-of-home simplicity at dusk.",
    keywords: ["ooh", "outdoor", "wide", "city", "cinematic"],
    motif: "type",
    palette: ["#5b6cff", "#101430"],
    thumbnail: "/marketing/billboard.webp",
    direction:
      "out-of-home billboard visual: giant type, a single product hero, extreme simplicity, dusk city light with a cool ambient and one warm practical glow, cinematic wide crop, at most four words of copy, the whole message legible from a hundred metres away",
    copy: "supplied",
    aspect: "16:9",
    model: NANO_BANANA,
  },

  // ---------- Marketplace ----------
  // Listing rules are literal, so these directions are too: a main image
  // wants pure white, roughly 85% frame fill and no graphics of any kind,
  // which is why pure-white is copy: "none" while the secondary slots that
  // are allowed to annotate are "supplied".
  {
    id: "pure-white",
    name: "Pure White",
    category: "marketplace",
    blurb: "Listing-compliant on #FFFFFF.",
    keywords: ["amazon", "shopify", "etsy", "catalog", "main image"],
    motif: "object",
    palette: ["#ffffff", "#c9c9cf"],
    thumbnail: "/marketing/pure-white.webp",
    direction:
      "e-commerce main listing photo on a pure white RGB 255,255,255 background, even shadowless lighting from both sides, the product fully in frame and filling about 85 percent of it, square-on hero angle, true color and crisp edges with no halo or cut-out fringe, at most a faint contact shadow, no props and no border",
    copy: "none",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "spec-infographic",
    name: "Spec Infographic",
    category: "marketplace",
    blurb: "Three benefits, legible as a thumbnail.",
    keywords: ["amazon", "a+", "infographic", "benefits", "icons"],
    motif: "grid",
    palette: ["#9ad1ff", "#1b3a5c"],
    thumbnail: "/marketing/spec-infographic.webp",
    direction:
      "listing infographic: the product centered with three short benefit labels in a clean icon-led grid, flat background, one accent color only, thick type and simple line icons sized to stay readable at thumbnail scale, even spacing and strict alignment",
    copy: "supplied",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "scale-diagram",
    name: "Scale & Size",
    category: "marketplace",
    blurb: "Measurement lines on a neutral field.",
    keywords: ["dimensions", "measurements", "diagram", "technical"],
    motif: "split",
    palette: ["#d5d9de", "#5a636e"],
    thumbnail: "/marketing/scale-diagram.webp",
    direction:
      "dimension diagram: the product straight-on with thin measurement lines, end ticks and short size labels on a neutral background, one consistent line weight, technical-drawing precision, uncluttered, a familiar everyday object beside it for scale",
    copy: "supplied",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "in-use",
    name: "In Use",
    category: "marketplace",
    blurb: "Real setting, real hands, window light.",
    keywords: ["lifestyle", "context", "home", "candid"],
    motif: "portrait",
    palette: ["#e3d3bd", "#7d6549"],
    thumbnail: "/marketing/in-use.webp",
    direction:
      "lifestyle listing photo showing the product being used in a real home, soft window light with a warm bounce, authentic candid framing, shallow depth of field with the product sharp and the room falling away, a tidy but lived-in set, natural skin tone, no other brand visible anywhere in frame",
    copy: "none",
    aspect: "1:1",
    model: NANO_BANANA,
  },
  {
    id: "bundle-contents",
    name: "Bundle Contents",
    category: "marketplace",
    blurb: "Everything in the box, laid out.",
    keywords: ["whats included", "kit", "set", "overhead"],
    motif: "grid",
    palette: ["#dfe3e8", "#8b93a1"],
    thumbnail: "/marketing/bundle-contents.webp",
    direction:
      "everything-in-the-box layout: every included item laid out top-down on a soft neutral surface, equal spacing and consistent orientation, even shadowless light, the main unit largest and centered with the accessories arranged around it, nothing cropped and nothing overlapping",
    copy: "none",
    aspect: "1:1",
    model: NANO_BANANA,
  },

  // ---------- UGC ----------
  // Defaults to the model that generates speech and ambience, since a silent
  // talking-head clip is not the thing anyone came here for. Each direction
  // ends by saying what the audio is, not just what the shot is: the sound is
  // half of why this format converts, and left unspecified these models score
  // the clip like a trailer.
  {
    id: "unboxing-selfie",
    name: "Unboxing Selfie",
    category: "ugc",
    blurb: "Phone in hand, first reaction.",
    keywords: ["tiktok", "reels", "unboxing", "handheld", "authentic"],
    motif: "phone",
    palette: ["#f4b8c8", "#7a3450"],
    thumbnail: "/marketing/unboxing-selfie.webp",
    video: "/marketing/videos/unboxing-selfie.mp4",
    direction:
      "handheld vertical selfie video with a phone-camera look, natural indoor light from a window, the person opens the box and reacts honestly to what is inside, then holds the product up to the lens so the label reads clearly, casual unpolished energy with slight handheld drift and a natural refocus, a normal speaking voice over quiet room tone and no music bed",
    copy: "none",
    aspect: "9:16",
    model: VEO_FAST,
  },
  {
    id: "talking-review",
    name: "Talking Review",
    category: "ugc",
    blurb: "Straight to camera, product in hand.",
    keywords: ["review", "testimonial", "creator", "talking head"],
    motif: "portrait",
    palette: ["#c9d8f0", "#33445e"],
    thumbnail: "/marketing/talking-review.webp",
    video: "/marketing/videos/talking-review.mp4",
    direction:
      "creator talking straight to camera while holding the product at chest height, a home background slightly out of focus, soft natural light on the face, eye contact with the lens, phone framing from just above eye level, honest conversational delivery at a normal pace with accurate lip sync, a close clean voice over quiet room tone",
    copy: "none",
    aspect: "9:16",
    model: VEO_FAST,
  },
  {
    id: "problem-fix",
    name: "Problem → Fix",
    category: "ugc",
    blurb: "Opens on the pain, cuts to the payoff.",
    keywords: ["hook", "pov", "before after", "pain point", "tiktok"],
    motif: "phone",
    palette: ["#a8d5ba", "#2f4f43"],
    thumbnail: "/marketing/problem-fix.webp",
    video: "/marketing/videos/problem-fix.mp4",
    direction:
      "vertical phone-shot clip that opens on the frustration the product solves, shown in the first two seconds, then turns to the same person using the product with the problem gone, the same room and the same light on both sides of the turn so the fix reads instantly, handheld and unpolished, a plain conversational voice with no music bed",
    copy: "none",
    aspect: "9:16",
    model: VEO_FAST,
  },
  {
    id: "grwm",
    name: "Get Ready With Me",
    category: "ugc",
    blurb: "Mid-routine, mirror light, talking.",
    keywords: ["grwm", "beauty", "routine", "vanity", "mirror"],
    motif: "phone",
    palette: ["#f3d9b1", "#8a6134"],
    thumbnail: "/marketing/grwm.webp",
    video: "/marketing/videos/grwm.mp4",
    direction:
      "vertical get-ready-with-me clip at a mirror or vanity, the person uses the product mid-routine while talking to camera, warm ambient light with a soft bulb glow, relaxed multitasking energy, the product turned face-on to the lens each time it is picked up, a natural unhurried voice over quiet room tone",
    copy: "none",
    aspect: "9:16",
    model: VEO_FAST,
  },
  {
    id: "hands-on-demo",
    name: "Hands-On Demo",
    category: "ugc",
    blurb: "Close-up hands, no faces.",
    keywords: ["demo", "how to", "tutorial", "close up", "asmr"],
    motif: "object",
    palette: ["#dcd3c6", "#6b6152"],
    thumbnail: "/marketing/hands-on-demo.webp",
    video: "/marketing/videos/hands-on-demo.mp4",
    direction:
      "close-up of hands demonstrating the product on a clean surface, alternating top-down and over-the-shoulder framing, no face in frame, crisp macro detail on every interaction, soft even light with no blown reflections, deliberate unhurried movement, close tactile contact sounds and no voice-over",
    copy: "none",
    aspect: "9:16",
    model: SEEDANCE_MINI,
  },
  {
    id: "street-vox-pop",
    name: "Street Vox Pop",
    category: "ugc",
    blurb: "Documentary interview, city bokeh.",
    keywords: ["interview", "street", "documentary", "man on the street"],
    motif: "portrait",
    palette: ["#b9c4c9", "#3c4a52"],
    thumbnail: "/marketing/street-vox-pop.webp",
    video: "/marketing/videos/street-vox-pop.mp4",
    direction:
      "documentary street interview, shallow depth of field with city bokeh behind, natural daylight, the person holds the product and answers a question from an off-camera interviewer, slight handheld movement, candid unrehearsed delivery with street ambience sitting under the voice",
    copy: "none",
    aspect: "9:16",
    model: VEO_FAST,
  },

  // ---------- Motion ----------
  {
    id: "2d-product-motion",
    name: "2D Product Motion",
    category: "motion",
    blurb: "Flat shapes, paper-cut layers, smooth eases.",
    keywords: ["motion graphics", "flat", "animation", "graphic"],
    motif: "object",
    palette: ["#b18cf5", "#f0d9c4"],
    thumbnail: "/marketing/2d-product-motion.webp",
    video: "/marketing/videos/2d-product-motion.mp4",
    direction:
      "flat graphic motion design, the product composited over animated 2D shapes and paper-cut layers, smooth eased transitions with a confident overshoot, bold flat color, a locked-off camera with no shake, shapes entering and leaving on a steady beat while the product stays fully visible throughout",
    copy: "none",
    aspect: "9:16",
    model: SEEDANCE_MINI,
  },
  {
    id: "hypermotion",
    name: "Hypermotion",
    category: "motion",
    blurb: "Whip pans, speed ramps, macro bursts.",
    keywords: ["fast", "energetic", "whip pan", "speed ramp", "macro"],
    motif: "splash",
    palette: ["#63e6be", "#0d6b7a"],
    thumbnail: "/marketing/hypermotion.webp",
    video: "/marketing/videos/hypermotion.mp4",
    direction:
      "hyper-kinetic macro motion, whip pans and speed ramps between extreme close-ups, liquid and ingredients bursting in slow motion, punchy contrast and saturated color, a high-energy cutting rhythm in which every shot resolves on the product, impact hits and whooshes carrying the cuts",
    copy: "none",
    aspect: "9:16",
    model: SEEDANCE_MINI,
  },
  {
    id: "kinetic-typography",
    name: "Kinetic Typography",
    category: "motion",
    blurb: "Words animate around the product.",
    keywords: ["typography", "text", "words", "lyric", "bold"],
    motif: "type",
    palette: ["#ff5fa2", "#2b0a1b"],
    thumbnail: "/marketing/kinetic-typography.webp",
    video: "/marketing/videos/kinetic-typography.mp4",
    direction:
      "kinetic typography spot: large words animate on and off around the product in a tight rhythm, bold sans-serif, high-contrast color blocking, each word landing on a beat and holding long enough to be read, the product anchored at the center and never covered by the type",
    copy: "supplied",
    aspect: "9:16",
    model: VEO_FAST,
  },
  {
    id: "dark-minimalism",
    name: "Dark Minimalism",
    category: "motion",
    blurb: "One light, one slow move, silence.",
    keywords: ["premium", "tech", "apple", "slow", "minimal"],
    motif: "object",
    palette: ["#4a4f57", "#0a0a0c"],
    thumbnail: "/marketing/dark-minimalism.webp",
    video: "/marketing/videos/dark-minimalism.mp4",
    direction:
      "minimal dark set, one slow deliberate camera move around the product, a single travelling light source tracing its edges, deep negative space and restraint, premium tech tone, no cuts, settling on a held hero frame, near-silence carried by one low sustained tone",
    copy: "none",
    aspect: "16:9",
    model: SEEDANCE_MINI,
  },
  {
    id: "liquid-pour",
    name: "Liquid Pour",
    category: "motion",
    blurb: "Slow-motion pour, macro, glossy.",
    keywords: ["pour", "drip", "slow motion", "macro", "texture"],
    motif: "splash",
    palette: ["#f0b67f", "#7c3f1d"],
    thumbnail: "/marketing/liquid-pour.webp",
    video: "/marketing/videos/liquid-pour.mp4",
    direction:
      "slow-motion pour or drip interacting with the product, macro lens, glossy surfaces, controlled studio light with crisp specular highlights, liquid moving with real viscosity and weight, a luxurious tactile feel, the label staying clean, dry and readable throughout",
    copy: "none",
    aspect: "9:16",
    model: SEEDANCE_MINI,
  },
  {
    id: "orbit-turntable",
    name: "Orbit Turntable",
    category: "motion",
    blurb: "Seamless 360° around the hero.",
    keywords: ["360", "turntable", "spin", "loop", "rotate"],
    motif: "orbit",
    palette: ["#a8b6c8", "#2c3746"],
    thumbnail: "/marketing/orbit-turntable.webp",
    video: "/marketing/videos/orbit-turntable.mp4",
    direction:
      "a smooth 360-degree orbit around the product on a turntable at constant speed, the last frame matching the first so it loops seamlessly, studio gradient background, consistent specular highlights through the whole rotation, no cuts, the product centered and stationary while only the camera moves",
    copy: "none",
    aspect: "1:1",
    model: SEEDANCE_MINI,
  },
  {
    id: "particle-reveal",
    name: "Particle Reveal",
    category: "motion",
    blurb: "Assembles from particles, lands on a hero frame.",
    keywords: ["reveal", "logo", "particles", "intro", "sting"],
    motif: "burst",
    palette: ["#7dd3fc", "#0c1f3d"],
    thumbnail: "/marketing/particle-reveal.webp",
    video: "/marketing/videos/particle-reveal.mp4",
    direction:
      "the product assembles from drifting particles and settles into a clean hero frame, dark studio, subtle volumetric light rays, the particles resolving completely rather than lingering around the edges, ending on a held still with clear space above the product, one rising whoosh into a soft impact",
    copy: "none",
    aspect: "16:9",
    model: SEEDANCE_MINI,
  },
];

const CATEGORY_KIND = new Map(MARKETING_CATEGORIES.map((c) => [c.id, c.kind]));

/** Image or video — owned by the category, never duplicated on the style. */
export function styleKind(style: MarketingStyle): MarketingKind {
  return CATEGORY_KIND.get(style.category) ?? "image";
}

export function getMarketingStyle(id: string): MarketingStyle | undefined {
  return MARKETING_STYLES.find((s) => s.id === id);
}

export function stylesInCategory(category: MarketingCategoryId): MarketingStyle[] {
  return MARKETING_STYLES.filter((s) => s.category === category);
}

/** Free-text search across the whole catalog — name, blurb and keywords. */
export function searchStyles(query: string): MarketingStyle[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MARKETING_STYLES.filter((s) =>
    [s.name, s.blurb, ...s.keywords].some((field) => field.toLowerCase().includes(q)),
  );
}

/** The tile the studio opens on. */
export const DEFAULT_MARKETING_STYLE_ID = "studio-seamless";
