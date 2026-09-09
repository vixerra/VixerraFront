// The Marketing Studio's style catalog — the "Choose style" library behind
// /studio (see src/components/studio/style-picker.tsx).
//
// A style is NOT a model parameter, for exactly the reason image-styles.ts
// spells out: the backend builds a generation's parameters strictly from the
// model registry (cloudflare-models.ts), so an invented `style` key would be
// dropped or rejected, and it would mean something different on each model
// anyway. A style here is three things the studio owns entirely:
//
//   1. `direction` — a medium/treatment/composition fragment folded into the
//      prompt (never subject matter; the brief supplies that).
//   2. `model` + `aspect` — the sensible default pairing for that look, both
//      still overridable in the composer.
//   3. `motif` + `palette` — how its card draws itself in the picker. The
//      catalog ships no image assets: every tile is CSS/SVG generated from
//      these two fields, so adding a style stays a one-object edit and the
//      repo gains no binaries.

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
   *  outside the theme tokens in globals.css. */
  palette: readonly [string, string];
  /** Folded into the prompt on submit. Treatment and composition only. */
  direction: string;
  /** Applied when the chosen model offers it, otherwise the model's own
   *  default stands — the registry's aspect enums genuinely differ. */
  aspect: "1:1" | "3:4" | "16:9" | "9:16";
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
    keywords: ["clean", "packshot", "catalog", "white"],
    motif: "object",
    palette: ["#e9e4dc", "#b8b0a4"],
    direction:
      "studio product photography on a seamless backdrop, large soft key light with a subtle rim, smooth gradient falloff, crisp product edges, nothing in frame competing with the product",
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
    direction:
      "editorial still life, the product raised on a stone pedestal in a minimal architectural set, hard directional sunlight with long soft shadows, warm neutral palette",
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
    direction:
      "high-speed flash photography, a liquid splash frozen mid-air around the product, crystalline droplets suspended, wet reflective surface, ultra-crisp macro detail",
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
    direction:
      "the product staged on natural materials — raw stone, linen, fresh foliage — dappled daylight through leaves, organic shadow shapes, calm earthy palette",
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
    direction:
      "low-key studio lighting on a black glossy surface, a single dramatic rim light tracing the product silhouette, deep shadows, premium reflective finish",
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
    direction:
      "bold duotone gradient backdrop, hard colored studio lights, the product floating in a playful weightless composition, punchy saturated color and crisp shadow shapes",
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
    direction:
      "the product at the center of its ingredients bursting outward in mid-air, motion frozen at high shutter speed, bright even key light, weightless arrangement",
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
    direction:
      "top-down flat lay on a textured surface, styled props arranged on a clean grid, even diffuse daylight, generous negative space",
    aspect: "1:1",
    model: NANO_BANANA,
  },

  // ---------- Ads ----------
  // Text-in-image is the whole point of this group, so it defaults to the
  // model that renders type most reliably rather than to the product-shot
  // default.
  {
    id: "headline-hero",
    name: "Headline Hero",
    category: "ads",
    blurb: "Big type, one product, nothing else.",
    keywords: ["poster", "typography", "campaign", "key visual"],
    motif: "type",
    palette: ["#bbdc12", "#1d2408"],
    direction:
      "advertising key visual, a large bold headline locked to a clear typographic grid with the product hero beside it, generous negative space, brand-poster composition",
    aspect: "1:1",
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
    direction:
      "promotional retail ad layout, a bold discount badge over a radial burst behind the product, high-contrast sale colors, loud but tidy composition",
    aspect: "1:1",
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
    direction:
      "clean advertising layout with thin leader lines running from the product to short feature labels, technical but elegant, plenty of empty space around the product",
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
    direction:
      "split-frame comparison composition divided by a crisp vertical line, identical lighting and framing on both halves, small clear labels in the corners",
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
    direction:
      "social-proof ad: a person's portrait beside a short quote card with a row of five stars, soft brand-tinted background, friendly approachable lighting",
    aspect: "1:1",
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
    direction:
      "out-of-home billboard visual: giant type, a single product hero, extreme simplicity, dusk city light, cinematic wide crop",
    aspect: "16:9",
    model: NANO_BANANA,
  },

  // ---------- Marketplace ----------
  {
    id: "pure-white",
    name: "Pure White",
    category: "marketplace",
    blurb: "Listing-compliant on #FFFFFF.",
    keywords: ["amazon", "shopify", "etsy", "catalog", "main image"],
    motif: "object",
    palette: ["#ffffff", "#c9c9cf"],
    direction:
      "e-commerce listing photo on a pure white background, even shadowless lighting, the product centered and fully in frame, no props and no text",
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
    direction:
      "listing infographic: the product centered with three short benefit labels in a clean icon-led grid, flat background, high legibility at thumbnail size",
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
    direction:
      "dimension diagram: the product with thin measurement lines and short size labels on a neutral background, technical-drawing precision, uncluttered",
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
    direction:
      "lifestyle listing photo showing the product being used in a real home setting, natural window light, authentic candid framing, shallow depth of field",
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
    direction:
      "everything-in-the-box layout: each included item laid out top-down in a neat grid on a soft neutral surface, even lighting, equal spacing",
    aspect: "1:1",
    model: NANO_BANANA,
  },

  // ---------- UGC ----------
  // Defaults to the model that generates speech and ambience, since a silent
  // talking-head clip is not the thing anyone came here for.
  {
    id: "unboxing-selfie",
    name: "Unboxing Selfie",
    category: "ugc",
    blurb: "Phone in hand, first reaction.",
    keywords: ["tiktok", "reels", "unboxing", "handheld", "authentic"],
    motif: "phone",
    palette: ["#f4b8c8", "#7a3450"],
    direction:
      "handheld vertical selfie video with a phone-camera look, natural indoor lighting, the person unboxes the product and reacts to it, casual authentic energy, slight handheld movement",
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
    direction:
      "creator talking straight to camera while holding the product at chest height, home background slightly out of focus, natural light, honest conversational delivery",
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
    direction:
      "vertical get-ready-with-me clip in a mirror or vanity setting, the person uses the product mid-routine while talking to camera, warm ambient light",
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
    direction:
      "close-up of hands demonstrating the product on a clean surface, alternating top-down and over-the-shoulder framing, no faces in frame, crisp detail on every interaction",
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
    direction:
      "documentary street interview, shallow depth of field with city bokeh behind, natural daylight, the person holds the product and answers a question to an off-camera interviewer",
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
    direction:
      "flat graphic motion design, the product composited over animated 2D shapes and paper-cut layers, smooth eased transitions, bold flat color, no camera shake",
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
    direction:
      "hyper-kinetic macro motion, whip pans and speed ramps between extreme close-ups, liquid and ingredients bursting in slow motion, high-energy cutting rhythm",
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
    direction:
      "kinetic typography spot: large words animate on and off around the product in a tight rhythm, bold sans-serif, high-contrast color blocking",
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
    direction:
      "minimal dark set, one slow deliberate camera move around the product, a single moving light source tracing its edges, negative space and restraint, premium tech tone",
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
    direction:
      "slow-motion pour or drip interacting with the product, macro lens, glossy surfaces, controlled studio light, luxurious tactile feel",
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
    direction:
      "smooth 360-degree orbit around the product on a turntable, seamless loop, studio gradient background, consistent specular highlights, no cuts",
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
    direction:
      "the product assembles from drifting particles and settles into a clean hero frame, dark studio, subtle volumetric light rays, ending on a held still",
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
