/**
 * The one place a frame is drawn.
 *
 * Both the live preview and the MP4 export call `drawFrame` — the preview
 * at whatever rate rAF gives it against playing `<video>` elements, the
 * export frame by frame against seeked ones. That is the whole reason this
 * file exists as a standalone module rather than living inside either
 * component: two renderers meant two sets of rounding, and the exported file
 * never quite matched what the user signed off on.
 *
 * Nothing here touches the DOM beyond the canvas context it is handed, and
 * nothing is stateful, so the export can run it against an OffscreenCanvas
 * on a different thread later without changing a line.
 */

import {
  clipsAt,
  overlaysAt,
  timelineLayout,
  type PlacedClip,
  type TimelineLayout,
} from "./project";
import { naturalSize, type MediaEl } from "./media";
import {
  TEXT_FONTS,
  type Clip,
  type ClipFilters,
  type Project,
  type TextOverlay,
  type Watermark,
} from "./types";

/** Gives the renderer something drawable for a clip. The preview hands over
 *  a playing `<video>`; the export hands over the same element parked on an
 *  exact frame. Returning null draws the background, which is what should
 *  happen while a source is still buffering. */
export type FrameSource = (clip: Clip) => MediaEl | null;

export type DrawContext = CanvasRenderingContext2D;

/* --------------------------------------------------------------- filters */

/** Peak blur radius, as a fraction of the canvas short side. Small on
 *  purpose: past this the frame is a coloured smear, not a look. */
const MAX_BLUR_FRACTION = 0.04;

export function blurPixels(strength: number, shortSide: number): number {
  return strength * MAX_BLUR_FRACTION * shortSide;
}

/**
 * The clip's colour treatment as a CSS filter string.
 *
 * `ctx.filter` takes the same syntax as the CSS property, which is what lets
 * the numbers in ClipFilters be authored once and mean the same thing on the
 * canvas and in any DOM chrome that wants to echo them (the timeline
 * thumbnails, for instance). Vignette is absent — CSS has no filter for it,
 * so it is painted by hand in drawVignette.
 */
export function filterString(filters: ClipFilters, shortSide: number): string {
  const parts: string[] = [];
  if (filters.brightness !== 1) parts.push(`brightness(${filters.brightness})`);
  if (filters.contrast !== 1) parts.push(`contrast(${filters.contrast})`);
  if (filters.saturate !== 1) parts.push(`saturate(${filters.saturate})`);
  if (filters.grayscale > 0) parts.push(`grayscale(${filters.grayscale})`);
  if (filters.sepia > 0) parts.push(`sepia(${filters.sepia})`);
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  if (filters.blur > 0) parts.push(`blur(${blurPixels(filters.blur, shortSide).toFixed(2)}px)`);
  return parts.length ? parts.join(" ") : "none";
}

/* ---------------------------------------------------------------- layout */

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Where a source frame lands on the canvas.
 *
 * `cover` and `blur` share the same rect — they differ only in what gets
 * painted behind, so the caller draws the backdrop and then calls this once.
 * Ken Burns rides on top of the user's own scale as a small extra zoom, so
 * that turning it on never undoes a crop they set by hand.
 */
export function fitRect(
  clip: Clip,
  sourceW: number,
  sourceH: number,
  canvasW: number,
  canvasH: number,
  progress: number,
): Rect {
  const sourceRatio = sourceW / sourceH;
  const canvasRatio = canvasW / canvasH;

  let w: number;
  let h: number;
  if (clip.fit === "fill") {
    w = canvasW;
    h = canvasH;
  } else if (clip.fit === "contain") {
    const containByWidth = sourceRatio > canvasRatio;
    w = containByWidth ? canvasW : canvasH * sourceRatio;
    h = containByWidth ? canvasW / sourceRatio : canvasH;
  } else {
    // cover / blur
    const coverByWidth = sourceRatio < canvasRatio;
    w = coverByWidth ? canvasW : canvasH * sourceRatio;
    h = coverByWidth ? canvasW / sourceRatio : canvasH;
  }

  const kb = kenBurnsTransform(clip, progress);
  const scale = clip.scale * kb.scale;
  w *= scale;
  h *= scale;

  const x = (canvasW - w) / 2 + (clip.offsetX + kb.x) * canvasW;
  const y = (canvasH - h) / 2 + (clip.offsetY + kb.y) * canvasH;
  return { x, y, w, h };
}

/** Deliberately gentle — 6% over the length of a clip is the difference
 *  between "the shot is alive" and "the shot is zooming". */
const KEN_BURNS_ZOOM = 0.06;
const KEN_BURNS_PAN = 0.035;

function kenBurnsTransform(clip: Clip, progress: number) {
  const t = Math.min(1, Math.max(0, progress));
  switch (clip.kenBurns) {
    case "in":
      return { scale: 1 + KEN_BURNS_ZOOM * t, x: 0, y: 0 };
    case "out":
      return { scale: 1 + KEN_BURNS_ZOOM * (1 - t), x: 0, y: 0 };
    // A pan needs headroom to move into, so it zooms in slightly and then
    // slides within the overscan rather than exposing an empty edge.
    case "left":
      return { scale: 1 + KEN_BURNS_ZOOM, x: KEN_BURNS_PAN * (0.5 - t), y: 0 };
    case "right":
      return { scale: 1 + KEN_BURNS_ZOOM, x: KEN_BURNS_PAN * (t - 0.5), y: 0 };
    default:
      return { scale: 1, x: 0, y: 0 };
  }
}

/* ------------------------------------------------------------ transitions */

type Blend = {
  alpha: number;
  /** Fraction of canvas width the incoming clip is pushed right by. */
  slideX: number;
  /** Extra scale for a zoom entrance. */
  scale: number;
  /** Fraction of canvas width revealed so far, or 1 for "all of it". */
  wipe: number;
};

const NO_BLEND: Blend = { alpha: 1, slideX: 0, scale: 1, wipe: 1 };

/**
 * How much of the incoming clip shows, part way through its entrance.
 *
 * `fade` is missing on purpose: it does not overlap, so it is handled as a
 * plain alpha ramp against the background in `backgroundBlend` rather than
 * as a blend between two clips.
 */
function transitionBlend(placed: PlacedClip, time: number): Blend {
  if (placed.transitionDuration <= 0) return NO_BLEND;
  const p = Math.min(1, Math.max(0, (time - placed.start) / placed.transitionDuration));
  if (p >= 1) return NO_BLEND;

  switch (placed.clip.transition.type) {
    case "dissolve":
      return { ...NO_BLEND, alpha: p };
    case "slide":
      return { ...NO_BLEND, slideX: 1 - p };
    case "wipe":
      return { ...NO_BLEND, wipe: p };
    case "zoom":
      return { ...NO_BLEND, alpha: p, scale: 1 + 0.25 * (1 - p) };
    default:
      return NO_BLEND;
  }
}

/**
 * Alpha from the non-overlapping `fade` transition — this clip dipping up
 * from the background at its start, and back down into it at its end when
 * the NEXT clip asked for a fade.
 *
 * The outgoing half has to be computed from the successor's setting rather
 * than the clip's own, because a transition in this model always belongs to
 * the clip it brings in. Without it a "Fade" between two clips would only
 * fade one way and read as a hard cut into a fade-up.
 */
function backgroundBlend(
  layout: TimelineLayout,
  placed: PlacedClip,
  index: number,
  time: number,
): number {
  let alpha = 1;

  const own = placed.clip.transition;
  if (index > 0 && own.type === "fade" && own.duration > 0) {
    const d = Math.min(own.duration, placed.duration / 2);
    alpha = Math.min(alpha, Math.min(1, (time - placed.start) / d));
  }

  const next = layout.placed[index + 1]?.clip.transition;
  if (next && next.type === "fade" && next.duration > 0) {
    const d = Math.min(next.duration, placed.duration / 2);
    alpha = Math.min(alpha, Math.min(1, (placed.end - time) / d));
  }

  return Math.max(0, alpha);
}

/* ------------------------------------------------------------------ draw */

export function drawFrame(
  ctx: DrawContext,
  project: Project,
  time: number,
  source: FrameSource,
  layout: TimelineLayout = timelineLayout(project),
) {
  const { width, height } = ctx.canvas;
  const shortSide = Math.min(width, height);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = project.background;
  ctx.fillRect(0, 0, width, height);

  const visible = clipsAt(layout, time);
  let topFilters: ClipFilters | null = null;

  for (const placed of visible) {
    const index = layout.placed.indexOf(placed);
    const video = source(placed.clip);
    if (!video || !naturalSize(video).width) continue;

    const blend = transitionBlend(placed, time);
    const alpha = blend.alpha * backgroundBlend(layout, placed, index, time);
    if (alpha <= 0.001) continue;

    drawClip(ctx, placed, video, blend, alpha, width, height, shortSide, time);
    topFilters = placed.clip.filters;
  }

  // Vignette is a property of the look, not of one layer, so it is laid over
  // the composited video rather than inside each clip's own draw — layering
  // two of them during a dissolve would double the darkening at the edges.
  if (topFilters && topFilters.vignette > 0) {
    drawVignette(ctx, width, height, topFilters.vignette);
  }

  ctx.filter = "none";
  ctx.globalAlpha = 1;

  for (const overlay of overlaysAt(project, time)) {
    drawTextOverlay(ctx, overlay, time, width, height);
  }

  if (project.watermark.enabled) {
    drawWatermark(ctx, project.watermark, width, height);
  }

  drawGlobalFade(ctx, project, time, layout.duration, width, height);
  ctx.restore();
}

function drawClip(
  ctx: DrawContext,
  placed: PlacedClip,
  video: MediaEl,
  blend: Blend,
  alpha: number,
  width: number,
  height: number,
  shortSide: number,
  time: number,
) {
  const clip = placed.clip;
  const progress = placed.duration > 0 ? (time - placed.start) / placed.duration : 0;
  // Reads naturalWidth on a still and videoWidth on a clip — the two element
  // kinds disagree about where their intrinsic size lives.
  const source = naturalSize(video);
  const rect = fitRect(clip, source.width, source.height, width, height, progress);

  ctx.save();
  ctx.globalAlpha = alpha;

  // A wipe reveals the incoming clip through a moving edge, so it has to
  // clip everything this clip draws — including its own blurred backdrop.
  if (blend.wipe < 1) {
    ctx.beginPath();
    ctx.rect(0, 0, width * blend.wipe, height);
    ctx.clip();
  }

  const dx = blend.slideX * width;

  // `blur` fit fills the empty space with a blown-up, blurred copy of the
  // same frame instead of a flat colour — the standard treatment for a
  // landscape clip in a vertical frame, and much better than letterboxing
  // when the export is going to a feed.
  if (clip.fit === "blur") {
    ctx.save();
    ctx.filter = `blur(${(shortSide * 0.06).toFixed(2)}px) brightness(0.55)`;
    const cover = coverRect(source.width, source.height, width, height, 1.25);
    ctx.drawImage(video, cover.x + dx, cover.y, cover.w, cover.h);
    ctx.restore();
  }

  ctx.filter = filterString(clip.filters, shortSide);

  if (blend.scale !== 1) {
    ctx.translate(width / 2 + dx, height / 2);
    ctx.scale(blend.scale, blend.scale);
    ctx.translate(-width / 2, -height / 2);
    ctx.drawImage(video, rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.drawImage(video, rect.x + dx, rect.y, rect.w, rect.h);
  }

  // `contain` leaves bars, and nothing is drawn into them here — whatever
  // the clip did not cover keeps the project background, already painted
  // underneath by drawFrame.
  ctx.restore();
}

function coverRect(
  sourceW: number,
  sourceH: number,
  canvasW: number,
  canvasH: number,
  overscan: number,
): Rect {
  const sourceRatio = sourceW / sourceH;
  const canvasRatio = canvasW / canvasH;
  const byWidth = sourceRatio < canvasRatio;
  const w = (byWidth ? canvasW : canvasH * sourceRatio) * overscan;
  const h = (byWidth ? canvasW / sourceRatio : canvasH) * overscan;
  return { x: (canvasW - w) / 2, y: (canvasH - h) / 2, w, h };
}

function drawVignette(ctx: DrawContext, width: number, height: number, strength: number) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, strength)})`);
  ctx.save();
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawGlobalFade(
  ctx: DrawContext,
  project: Project,
  time: number,
  duration: number,
  width: number,
  height: number,
) {
  let cover = 0;
  if (project.fadeIn > 0 && time < project.fadeIn) {
    cover = Math.max(cover, 1 - time / project.fadeIn);
  }
  if (project.fadeOut > 0 && time > duration - project.fadeOut) {
    cover = Math.max(cover, 1 - (duration - time) / project.fadeOut);
  }
  if (cover <= 0) return;

  ctx.save();
  ctx.filter = "none";
  ctx.globalAlpha = Math.min(1, cover);
  ctx.fillStyle = project.background;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/* ------------------------------------------------------------------ text */

/**
 * Resolves a font role to a real family stack.
 *
 * The families are next/font-generated names that only exist as CSS custom
 * properties on `<html>`, so they have to be read back out of the computed
 * style — hardcoding "Space Grotesk" here would silently fall through to the
 * generic fallback in production, where the family is hashed.
 *
 * Canvas accepts a full stack in `ctx.font`, so the variable's value goes in
 * verbatim. Callers must await `document.fonts.ready` first: an unloaded
 * face measures at the fallback's metrics and the text wraps in the wrong
 * places.
 */
function fontStack(role: string): { stack: string; weight: number; italic: boolean } {
  const spec = TEXT_FONTS.find((f) => f.id === role) ?? TEXT_FONTS[0];
  const stack =
    typeof window === "undefined"
      ? "sans-serif"
      : getComputedStyle(document.documentElement).getPropertyValue(spec.cssVar).trim() ||
        "sans-serif";
  return { stack, weight: spec.weight, italic: "italic" in spec && Boolean(spec.italic) };
}

const LINE_HEIGHT = 1.22;

function wrapLines(ctx: DrawContext, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  // Explicit newlines are honoured — people type them deliberately, and
  // re-flowing them would fight the user for control of the layout.
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  return lines;
}

/** How long a text animation takes, in seconds. Short — an overlay that is
 *  on screen for 1.5s cannot afford a half-second entrance. */
const TEXT_ANIM_SECONDS = 0.35;

function drawTextOverlay(
  ctx: DrawContext,
  overlay: TextOverlay,
  time: number,
  width: number,
  height: number,
) {
  const raw = overlay.uppercase ? overlay.text.toUpperCase() : overlay.text;
  if (!raw.trim()) return;

  const { stack, weight, italic } = fontStack(overlay.font);
  const fontSize = overlay.size * height;
  ctx.font = `${italic ? "italic " : ""}${weight} ${fontSize}px ${stack}`;
  ctx.textBaseline = "top";
  ctx.textAlign = overlay.align;

  const lines = wrapLines(ctx, raw, overlay.maxWidth * width);
  const lineHeight = fontSize * LINE_HEIGHT;
  const blockHeight = lines.length * lineHeight;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));

  // Entrance and exit share one progress value, so a title that is only just
  // long enough to animate in doesn't pop out.
  const inP = Math.min(1, (time - overlay.start) / TEXT_ANIM_SECONDS);
  const outP = Math.min(1, (overlay.end - time) / TEXT_ANIM_SECONDS);
  const p = Math.max(0, Math.min(inP, outP));

  let alpha = 1;
  let dy = 0;
  let scale = 1;
  if (overlay.animation === "fade") alpha = p;
  if (overlay.animation === "rise") {
    alpha = p;
    dy = (1 - p) * fontSize * 0.6;
  }
  if (overlay.animation === "pop") {
    alpha = p;
    scale = 0.86 + 0.14 * p;
  }

  const anchorX = overlay.x * width;
  // `y` is the block's CENTRE, not its first line's top. Anchoring the top
  // means a caption grows downward as it wraps, so a two-line title placed
  // near the bottom edge silently walks off the frame the moment the user
  // adds a third word. Centring also makes the control read the way its
  // label promises: 0.5 puts the text in the middle of the picture.
  const centreY = overlay.y * height + dy;
  const anchorY = centreY - blockHeight / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (scale !== 1) {
    ctx.translate(anchorX, centreY);
    ctx.scale(scale, scale);
    ctx.translate(-anchorX, -centreY);
  }

  if (overlay.boxColor) {
    const padX = fontSize * 0.5;
    const padY = fontSize * 0.32;
    const boxW = widest + padX * 2;
    const left =
      overlay.align === "center"
        ? anchorX - boxW / 2
        : overlay.align === "right"
          ? anchorX - boxW
          : anchorX;
    ctx.fillStyle = overlay.boxColor;
    roundedRect(ctx, left, anchorY - padY, boxW, blockHeight + padY * 2, fontSize * 0.28);
    ctx.fill();
  }

  if (overlay.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = fontSize * 0.28;
    ctx.shadowOffsetY = fontSize * 0.06;
  }
  ctx.fillStyle = overlay.color;
  lines.forEach((line, i) => ctx.fillText(line, anchorX, anchorY + i * lineHeight));
  ctx.restore();
}

function roundedRect(
  ctx: DrawContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/* ------------------------------------------------------------- watermark */

/**
 * Decoded logos, keyed by their data URI.
 *
 * `drawFrame` is synchronous — it is called from a rAF loop and from a
 * tight export loop, and neither can await an image decode per frame. So a
 * logo is decoded once on first sight and the frames before it lands simply
 * draw without it. `primeWatermark` exists so the export can force that
 * decode to have happened before the first frame is written.
 */
const logoCache = new Map<string, HTMLImageElement>();

export function primeWatermark(watermark: Watermark): Promise<void> {
  const src = watermark.imageDataUrl;
  if (!watermark.enabled || watermark.kind !== "image" || !src) return Promise.resolve();
  const existing = logoCache.get(src);
  if (existing?.complete) return Promise.resolve();

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      logoCache.set(src, image);
      resolve();
    };
    // A logo that will not decode must not take the export down with it.
    image.onerror = () => resolve();
    image.src = src;
  });
}

function anchorPoint(
  position: string,
  width: number,
  height: number,
  boxW: number,
  boxH: number,
  margin: number,
) {
  const [vertical, horizontal] = position.split("-");
  const x =
    horizontal === "left"
      ? margin
      : horizontal === "right"
        ? width - boxW - margin
        : (width - boxW) / 2;
  const y =
    vertical === "top"
      ? margin
      : vertical === "bottom"
        ? height - boxH - margin
        : (height - boxH) / 2;
  return { x, y };
}

function drawWatermark(
  ctx: DrawContext,
  watermark: Watermark,
  width: number,
  height: number,
) {
  const margin = watermark.margin * Math.min(width, height);
  ctx.save();
  ctx.globalAlpha = watermark.opacity;
  ctx.filter = "none";

  if (watermark.kind === "image" && watermark.imageDataUrl) {
    let image = logoCache.get(watermark.imageDataUrl);
    if (!image) {
      image = new Image();
      image.src = watermark.imageDataUrl;
      logoCache.set(watermark.imageDataUrl, image);
    }
    if (image.complete && image.naturalWidth) {
      const boxW = watermark.size * width;
      const boxH = (boxW * image.naturalHeight) / image.naturalWidth;
      const { x, y } = anchorPoint(watermark.position, width, height, boxW, boxH, margin);
      ctx.drawImage(image, x, y, boxW, boxH);
    }
  } else if (watermark.text.trim()) {
    const { stack, weight } = fontStack("display");
    // Sized off the short side rather than the width so the same setting
    // reads the same in a 9:16 frame and a 21:9 one.
    const fontSize = watermark.size * Math.min(width, height) * 0.32;
    ctx.font = `${weight} ${fontSize}px ${stack}`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const metrics = ctx.measureText(watermark.text);
    const { x, y } = anchorPoint(
      watermark.position,
      width,
      height,
      metrics.width,
      fontSize,
      margin,
    );
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = fontSize * 0.35;
    ctx.fillStyle = watermark.color;
    ctx.fillText(watermark.text, x, y);
  }

  ctx.restore();
}
