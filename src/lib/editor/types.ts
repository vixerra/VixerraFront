/**
 * The Editing Studio's document model.
 *
 * A project is a plain, JSON-serialisable description of an edit — it holds
 * no media, only references to generations the user already owns plus the
 * numbers needed to redraw them. That is what lets the same object drive the
 * live canvas preview, survive a page reload through localStorage, and be
 * stored alongside the exported clip so an edit can be reopened later.
 *
 * Two rules keep the preview and the export pixel-identical, and both are
 * easy to break by accident:
 *
 *   1. Every spatial value is NORMALISED (a 0..1 fraction of the canvas),
 *      never a pixel. The canvas is 1080x1920 on export and maybe 320x568
 *      on screen; a pixel font size would land in two different places.
 *   2. Time is always TIMELINE seconds unless a field says otherwise.
 *      `Clip.in`/`Clip.out` are the exception — they are SOURCE seconds,
 *      because that is what `<video>.currentTime` wants.
 */

/** Frame that the finished video is delivered in. Vertical first: this app's
 *  models produce short social clips, and 9:16 is what they're posted as. */
export const ASPECT_PRESETS = [
  { id: "9:16", label: "Vertical", hint: "TikTok · Reels · Shorts", w: 9, h: 16 },
  { id: "4:5", label: "Portrait", hint: "Instagram feed", w: 4, h: 5 },
  { id: "1:1", label: "Square", hint: "Feed · thumbnails", w: 1, h: 1 },
  { id: "16:9", label: "Landscape", hint: "YouTube · web", w: 16, h: 9 },
  { id: "21:9", label: "Cinematic", hint: "Ultrawide banner", w: 21, h: 9 },
] as const;
export type AspectId = (typeof ASPECT_PRESETS)[number]["id"];

/**
 * Export sizes, given as the SHORT side so one number works for every
 * aspect: 1080 means 1080x1920 vertical and 1920x1080 landscape, which is
 * what people mean by "1080p" in both cases.
 *
 * Bitrates are deliberately generous. The sources are already-compressed
 * model output, so re-encoding them is a second generation loss; spending
 * bits here is the cheapest way to stop the export looking worse than the
 * clips that went into it.
 */
export const EXPORT_QUALITIES = [
  { id: "540", label: "540p", hint: "Draft · smallest file", shortSide: 540, bitrate: 2_500_000 },
  { id: "720", label: "720p", hint: "Good for most posts", shortSide: 720, bitrate: 5_000_000 },
  { id: "1080", label: "1080p", hint: "Best quality", shortSide: 1080, bitrate: 9_000_000 },
] as const;
export type QualityId = (typeof EXPORT_QUALITIES)[number]["id"];

export const EXPORT_FPS = [24, 30, 60] as const;
export type ExportFps = (typeof EXPORT_FPS)[number];

/**
 * How a clip whose aspect doesn't match the canvas is placed in it.
 *   cover   — fill the frame, crop the overflow (the social default)
 *   contain — show the whole frame, letterbox the rest
 *   fill    — stretch to fit, distorting
 *   blur    — cover, over a blurred blown-up copy of itself as the backdrop
 */
export const FIT_MODES = ["cover", "contain", "fill", "blur"] as const;
export type FitMode = (typeof FIT_MODES)[number];

/**
 * What happens at the seam before a clip.
 *
 * `fade` is the only one that does NOT overlap the two clips — it dips
 * through the background colour, so the outgoing clip finishes before the
 * incoming one starts. Everything else steals `duration` seconds off the
 * end of the previous clip and plays both at once, which is why
 * `timelineLayout` has to subtract it from the running total.
 */
export const TRANSITIONS = [
  { id: "none", label: "Cut", overlaps: false },
  { id: "fade", label: "Fade", overlaps: false },
  { id: "dissolve", label: "Dissolve", overlaps: true },
  { id: "slide", label: "Slide", overlaps: true },
  { id: "wipe", label: "Wipe", overlaps: true },
  { id: "zoom", label: "Zoom", overlaps: true },
] as const;
export type TransitionId = (typeof TRANSITIONS)[number]["id"];

/** Slow push/pull applied across a clip's whole length. A still-ish AI clip
 *  reads as much more deliberate with a 4% drift on it than without. */
export const KEN_BURNS = ["none", "in", "out", "left", "right"] as const;
export type KenBurns = (typeof KEN_BURNS)[number];

/** Colour treatment. Stored as the numbers rather than a preset name so a
 *  preset can be applied and then nudged — see FILTER_PRESETS. */
export type ClipFilters = {
  /** 1 = untouched, for the four multiplicative ones. */
  brightness: number;
  contrast: number;
  saturate: number;
  /** 0..1 mixes. */
  grayscale: number;
  sepia: number;
  /** Degrees, -180..180. */
  hueRotate: number;
  /** 0..1 strength, NOT pixels — resolved against the canvas short side at
   *  draw time (see blurPixels) so a preview rendered at 540p and an export
   *  at 1080p blur by the same visible amount. */
  blur: number;
  /** Vignette strength 0..1 — drawn by hand, CSS has no filter for it. */
  vignette: number;
};

export const NEUTRAL_FILTERS: ClipFilters = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  blur: 0,
  vignette: 0,
};

export const FILTER_PRESETS: { id: string; label: string; values: ClipFilters }[] = [
  { id: "none", label: "Original", values: NEUTRAL_FILTERS },
  {
    id: "punch",
    label: "Punch",
    values: { ...NEUTRAL_FILTERS, contrast: 1.18, saturate: 1.25, brightness: 1.03 },
  },
  {
    id: "noir",
    label: "Noir",
    values: { ...NEUTRAL_FILTERS, grayscale: 1, contrast: 1.3, vignette: 0.35 },
  },
  {
    id: "warm",
    label: "Warm",
    values: { ...NEUTRAL_FILTERS, sepia: 0.28, saturate: 1.15, brightness: 1.04 },
  },
  {
    id: "cold",
    label: "Cold",
    values: { ...NEUTRAL_FILTERS, hueRotate: -12, saturate: 0.9, contrast: 1.1 },
  },
  {
    id: "faded",
    label: "Faded",
    values: { ...NEUTRAL_FILTERS, contrast: 0.85, saturate: 0.8, brightness: 1.08 },
  },
  {
    id: "cinema",
    label: "Cinema",
    values: { ...NEUTRAL_FILTERS, contrast: 1.15, saturate: 0.92, hueRotate: -6, vignette: 0.28 },
  },
];

/** A still behaves like a clip whose frame never changes: no seeking, no
 *  audio, and a length the user chooses rather than one the file dictates. */
export type ClipKind = "video" | "image";

/** How long a still lands on the timeline, and the ceiling the trim handles
 *  allow it to be stretched to. A video's ceiling is its real duration; an
 *  image has none, so one is invented — generous enough to hold a title card
 *  or an outro, short enough that the default timeline stays sane. */
export const IMAGE_CLIP_DEFAULT_DURATION = 4;
export const IMAGE_CLIP_MAX_DURATION = 30;

export type Clip = {
  id: string;
  /** Optional so projects saved before stills existed still load — absent
   *  means "video", which is what every stored clip was. */
  kind?: ClipKind;
  /** The Generation this came from. Kept so the export can record what it
   *  was built out of, and so a reopened project can re-sign its URL — the
   *  stored playback URL is a short-lived signed R2 link and WILL be dead. */
  sourceId: string;
  /** Freshly signed on load; never trusted from a saved project. */
  sourceUrl: string;
  /** Poster for the timeline strip, same caveat as sourceUrl. */
  posterUrl: string | null;
  /** Shown on the timeline block and in the library. */
  label: string;
  /** Full length of the source in seconds, as reported by the decoder. */
  sourceDuration: number;

  /** Trim, in SOURCE seconds. out > in always. */
  in: number;
  out: number;
  /** 0.25..4. Timeline length is (out - in) / speed. */
  speed: number;

  fit: FitMode;
  /** Extra zoom on top of the fit, 1 = none. */
  scale: number;
  /** Pan, as a fraction of the canvas. Positive x moves the image right. */
  offsetX: number;
  offsetY: number;
  kenBurns: KenBurns;

  filters: ClipFilters;
  /** 0..1, applied to this clip's own audio in the mixdown. */
  volume: number;

  transition: { type: TransitionId; duration: number };
};

export const TEXT_FONTS = [
  { id: "display", label: "Display", cssVar: "--font-display", weight: 700 },
  { id: "body", label: "Body", cssVar: "--font-sans", weight: 600 },
  { id: "accent", label: "Editorial", cssVar: "--font-accent", weight: 400, italic: true },
  { id: "mono", label: "Mono", cssVar: "--font-mono", weight: 500 },
] as const;
export type TextFontId = (typeof TEXT_FONTS)[number]["id"];

export const TEXT_ANIMATIONS = ["none", "fade", "rise", "pop"] as const;
export type TextAnimation = (typeof TEXT_ANIMATIONS)[number];

export type TextOverlay = {
  id: string;
  text: string;
  /** TIMELINE seconds. An overlay is independent of the clips under it, so
   *  a title can ride across a cut. */
  start: number;
  end: number;

  /**
   * Anchor point, 0..1 of the canvas — the CENTRE of the text block on both
   * axes (`align` then decides which edge of the block x lines up with).
   *
   * Centring vertically rather than anchoring the first line's top is what
   * keeps a caption from walking off the bottom of the frame as it wraps
   * onto more lines.
   */
  x: number;
  y: number;
  align: "left" | "center" | "right";
  /** Fraction of canvas HEIGHT, so text keeps its proportion at every
   *  export size and in every aspect. */
  size: number;
  /** Fraction of canvas width the block wraps at. */
  maxWidth: number;
  font: TextFontId;
  color: string;
  /** Rounded pill behind the text. Empty string = no box. */
  boxColor: string;
  /** Contrast insurance over busy footage, independent of the box. */
  shadow: boolean;
  uppercase: boolean;
  animation: TextAnimation;
};

export const WATERMARK_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

export type Watermark = {
  enabled: boolean;
  kind: "text" | "image";
  text: string;
  /**
   * The logo, as a data URI.
   *
   * Deliberately inlined into the project rather than uploaded: a watermark
   * is the user's own mark, it has to be there the instant the canvas
   * draws, and round-tripping it through R2 would mean an upload, a signed
   * URL and a CORS problem for something that is typically 30KB. It is
   * downscaled to WATERMARK_MAX_PX before it is stored — see readImageFile.
   */
  imageDataUrl: string | null;
  position: WatermarkPosition;
  /** Fraction of canvas WIDTH. */
  size: number;
  opacity: number;
  /** Fraction of the canvas short side, kept off every edge. */
  margin: number;
  /** Text-mode only. */
  color: string;
};

export type MusicTrack = {
  /** Key into the IndexedDB asset store — the audio file itself never goes
   *  into the project JSON (localStorage would blow its quota on one song). */
  assetId: string;
  name: string;
  /** Length in seconds, read once at attach time so the UI can draw it. */
  duration: number;
  volume: number;
  /** Seconds into the track that timeline zero maps to. */
  offset: number;
  fadeIn: number;
  fadeOut: number;
  /** Repeat the track if the timeline outlasts it. */
  loop: boolean;
};

export type Project = {
  id: string;
  name: string;
  /** ISO strings — this object is JSON, and Dates don't survive the trip. */
  createdAt: string;
  updatedAt: string;

  aspect: AspectId;
  quality: QualityId;
  fps: ExportFps;
  /** Behind `contain` letterboxing and under `fade` transitions. */
  background: string;

  clips: Clip[];
  overlays: TextOverlay[];
  watermark: Watermark;
  music: MusicTrack | null;

  /** Original clip audio, on top of which music is mixed. */
  keepSourceAudio: boolean;
  /** Whole-video fades, in seconds. */
  fadeIn: number;
  fadeOut: number;
};

export const WATERMARK_MAX_PX = 640;

/** Hard ceiling on a single export, matched to what routes/upload.ts on the
 *  API accepts (50MB) so a render can never succeed and then fail to save. */
export const MAX_EXPORT_BYTES = 50 * 1024 * 1024;

/** The generation `type` and `model` an export is filed under, so the
 *  gallery can tell a studio edit apart from a model run. Mirrored in the
 *  API's routes/generations.ts — keep the two in sync. */
export const EDIT_GENERATION_TYPE = "edit";
export const EDIT_GENERATION_MODEL = "aivio/editing-studio";

export const DEFAULT_WATERMARK: Watermark = {
  enabled: false,
  kind: "text",
  text: "",
  imageDataUrl: null,
  position: "bottom-right",
  size: 0.22,
  opacity: 0.85,
  margin: 0.04,
  color: "#ffffff",
};

export function emptyProject(name = "Untitled edit"): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    aspect: "9:16",
    quality: "720",
    fps: 30,
    background: "#000000",
    clips: [],
    overlays: [],
    watermark: { ...DEFAULT_WATERMARK },
    music: null,
    keepSourceAudio: true,
    fadeIn: 0,
    fadeOut: 0,
  };
}

/** Canvas pixel size for a project. Both sides are forced even — H.264
 *  macroblocks are 16x16 and every encoder in the wild rejects, or silently
 *  mangles, an odd dimension. */
export function canvasSize(aspect: AspectId, quality: QualityId) {
  const preset = ASPECT_PRESETS.find((a) => a.id === aspect) ?? ASPECT_PRESETS[0];
  const shortSide = (EXPORT_QUALITIES.find((q) => q.id === quality) ?? EXPORT_QUALITIES[1]).shortSide;
  const portrait = preset.w <= preset.h;
  const width = portrait ? shortSide : Math.round((shortSide * preset.w) / preset.h);
  const height = portrait ? Math.round((shortSide * preset.h) / preset.w) : shortSide;
  return { width: even(width), height: even(height) };
}

function even(n: number) {
  return n % 2 === 0 ? n : n + 1;
}

export function defaultClip(input: {
  sourceId: string;
  sourceUrl: string;
  posterUrl: string | null;
  label: string;
  /** For a video, its real length. For an image, the trim ceiling. */
  duration: number;
  kind?: ClipKind;
  /** Initial timeline length. Defaults to the whole source, which is right
   *  for a video but far too long for a still. */
  initialOut?: number;
}): Clip {
  const kind = input.kind ?? "video";
  return {
    id: crypto.randomUUID(),
    kind,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    posterUrl: input.posterUrl,
    label: input.label,
    sourceDuration: input.duration,
    in: 0,
    out: Math.min(input.initialOut ?? input.duration, input.duration),
    speed: 1,
    fit: "cover",
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    kenBurns: "none",
    filters: { ...NEUTRAL_FILTERS },
    // Stills carry no audio track, so a volume of 1 would put a live-looking
    // slider on a clip that can never make a sound.
    volume: kind === "image" ? 0 : 1,
    // A cut, not a dissolve: the first thing anyone does after adding two
    // clips is watch them, and an unrequested crossfade reads as a bug.
    transition: { type: "none", duration: 0.5 },
  };
}

export function defaultOverlay(start: number, end: number): TextOverlay {
  return {
    id: crypto.randomUUID(),
    text: "Your text here",
    start,
    end,
    x: 0.5,
    y: 0.72,
    align: "center",
    size: 0.06,
    maxWidth: 0.84,
    font: "display",
    color: "#ffffff",
    boxColor: "",
    shadow: true,
    uppercase: false,
    animation: "fade",
  };
}
