"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import type { MarketingStyle, StyleMotif } from "@/lib/marketing-styles";
import { cn } from "@/lib/utils";

/** How long a pointer has to rest on a tile before its loop is fetched. A
 *  sweep across the grid passes over every card in a row; without this, each
 *  one it grazes starts a download that is cancelled a frame later. */
const HOVER_INTENT_MS = 120;

/**
 * The artwork on a style card: a rendered sample when the style has one,
 * otherwise a tile drawn from its palette and motif — and, for a style with a
 * `video`, its loop playing over that still while `playing` is true.
 *
 * The drawn tile came first, because the catalog shipped no art and every
 * sample we could have borrowed would either be someone else's work or a
 * claim ("this is what this style produces") the catalog couldn't back. The
 * samples in /public/marketing are neither — each is a generation from this
 * studio off the prompt recorded in docs/marketing-style-thumbnails.md. The
 * drawn tile stays for styles without art and as the fallback behind every
 * image that hasn't loaded yet, so it is a supported state, not a stopgap.
 *
 * `playing` is the caller's call rather than this component's own hover
 * state: a picker card wants the whole card (name and blurb included) to
 * count, and wants keyboard focus to count too, while the 56px header chip
 * wants no playback at all.
 */
export function StylePreview({
  style,
  className,
  playing = false,
}: {
  style: MarketingStyle;
  className?: string;
  playing?: boolean;
}) {
  if (!style.video) return <StillTile style={style} className={className} />;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <StillTile style={style} />
      <PreviewLoop src={style.video} playing={playing} />
    </div>
  );
}

/**
 * The loop over a video style's tile.
 *
 * `preload="none"` is the whole point: a category of seven video styles would
 * otherwise start seven downloads the moment the picker opens. The clip is
 * fetched on the first hover and cached from then on. It stays invisible
 * until it is actually painting frames, so the still underneath covers the
 * load instead of a black box.
 */
function PreviewLoop({ src, playing }: { src: string; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [painting, setPainting] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!playing) {
      video.pause();
      return;
    }
    // Hover-to-play is user-initiated, but a looping clip is still exactly
    // the motion this setting asks us to hold back.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setTimeout(() => {
      video.currentTime = 0;
      // Rejects with AbortError when a pause lands before playback starts —
      // the pointer simply moved on, which is not a failure.
      video.play().catch(() => {});
    }, HOVER_INTENT_MS);
    return () => window.clearTimeout(timer);
  }, [playing]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      tabIndex={-1}
      // Decorative: the still underneath already carries the tile's name.
      aria-hidden="true"
      onPlaying={() => setPainting(true)}
      onPause={() => setPainting(false)}
      className={cn(
        "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
        painting ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

function StillTile({ style, className }: { style: MarketingStyle; className?: string }) {
  if (style.thumbnail) {
    return (
      // The gradient sits under the image rather than beside it: the card has
      // no background of its own, so without it a slow tile is a transparent
      // hole in the grid. Positioning lives here, not on the callers — two of
      // the three (the header chip, the idle canvas) size their box without
      // making it a containing block, which `fill` would otherwise escape.
      <div
        className={cn("relative h-full w-full overflow-hidden", className)}
        style={{ background: `linear-gradient(135deg, ${style.palette[0]}, ${style.palette[1]})` }}
      >
        <Image
          src={style.thumbnail}
          alt={`${style.name} style preview`}
          fill
          // Largest on-screen box is the idle canvas at 160px; the grid cards
          // land near 200. 320 covers both at 2x without asking the optimizer
          // for a size no tile displays.
          sizes="320px"
          className="object-cover"
        />
      </div>
    );
  }

  return <StyleMotifTile style={style} className={className} />;
}

function StyleMotifTile({
  style,
  className,
}: {
  style: MarketingStyle;
  className?: string;
}) {
  // Two cards of the same style can be on screen at once (the grid and the
  // studio's header chip), and duplicate gradient ids would make one of them
  // silently borrow the other's fill.
  const gradientId = useId();
  const [from, to] = style.palette;

  // Light palettes get dark linework and vice versa — Dark Luxe's near-black
  // gradient would swallow a dark motif entirely.
  const dark = relativeLuminance(to) + relativeLuminance(from) > 0.85;
  const ink = dark ? "rgb(12 12 14 / 0.82)" : "rgb(255 255 255 / 0.88)";
  const inkSoft = dark ? "rgb(12 12 14 / 0.45)" : "rgb(255 255 255 / 0.45)";
  const wash = dark ? "#ffffff" : "#000000";

  return (
    <svg
      viewBox="0 0 120 160"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${style.name} style preview`}
      className={cn("h-full w-full", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>

      <rect width="120" height="160" fill={`url(#${gradientId})`} />
      {/* One soft light source, top-left — enough to keep a flat gradient
          from reading as a color swatch. */}
      <circle cx="26" cy="22" r="46" fill={dark ? "#ffffff" : "#ffffff"} opacity="0.14" />
      <rect width="120" height="160" fill={wash} opacity="0.04" />

      <Motif motif={style.motif} ink={ink} inkSoft={inkSoft} light={from} />
    </svg>
  );
}

function Motif({
  motif,
  ink,
  inkSoft,
  light,
}: {
  motif: StyleMotif;
  ink: string;
  inkSoft: string;
  /** The palette's light end, used for the "label" patch on a product. */
  light: string;
}) {
  switch (motif) {
    case "pedestal":
      return (
        <g>
          <rect x="40" y="104" width="40" height="30" fill={inkSoft} />
          <ellipse cx="60" cy="104" rx="20" ry="6" fill={ink} opacity="0.35" />
          <Product ink={ink} light={light} x={50} y={56} width={20} height={48} />
          <ellipse cx="60" cy="136" rx="30" ry="7" fill={ink} opacity="0.2" />
        </g>
      );

    case "splash":
      return (
        <g>
          <path
            d="M22 104 C22 74 34 54 58 44"
            fill="none"
            stroke={ink}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M98 104 C98 74 86 54 62 44"
            fill="none"
            stroke={ink}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.4"
          />
          <Product ink={ink} light={light} x={46} y={60} width={28} height={56} />
          <circle cx="28" cy="60" r="4" fill={ink} opacity="0.5" />
          <circle cx="94" cy="70" r="5" fill={ink} opacity="0.4" />
          <circle cx="84" cy="40" r="3" fill={ink} opacity="0.55" />
          <ellipse cx="60" cy="124" rx="34" ry="6" fill={ink} opacity="0.2" />
        </g>
      );

    case "burst":
      return (
        <g>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x="59"
              y="16"
              width="2.5"
              height="26"
              rx="1.25"
              fill={ink}
              opacity="0.35"
              transform={`rotate(${i * 30} 60 80)`}
            />
          ))}
          <circle cx="60" cy="80" r="24" fill={ink} opacity="0.85" />
          <rect x="48" y="76" width="24" height="4" rx="2" fill={light} opacity="0.9" />
          <rect x="52" y="86" width="16" height="4" rx="2" fill={light} opacity="0.6" />
        </g>
      );

    case "type":
      return (
        <g>
          <rect x="18" y="40" width="80" height="13" rx="3" fill={ink} opacity="0.9" />
          <rect x="18" y="59" width="56" height="13" rx="3" fill={ink} opacity="0.6" />
          <rect x="18" y="78" width="68" height="13" rx="3" fill={ink} opacity="0.35" />
          <Product ink={ink} light={light} x={70} y={102} width={22} height={38} />
        </g>
      );

    case "grid":
      return (
        <g>
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={20 + col * 28}
                y={40 + row * 28}
                width="22"
                height="22"
                rx="5"
                fill={ink}
                opacity={row === 1 && col === 1 ? 0.9 : 0.3 + ((row + col) % 3) * 0.08}
              />
            )),
          )}
        </g>
      );

    case "portrait":
      return (
        <g>
          <circle cx="60" cy="62" r="21" fill={ink} opacity="0.9" />
          <path
            d="M26 138 C26 114 41 100 60 100 C79 100 94 114 94 138 Z"
            fill={ink}
            opacity="0.75"
          />
        </g>
      );

    case "split":
      return (
        <g>
          <rect x="14" y="38" width="42" height="84" rx="6" fill={ink} opacity="0.3" />
          <rect x="64" y="38" width="42" height="84" rx="6" fill={ink} opacity="0.72" />
          <rect x="58.5" y="28" width="3" height="104" rx="1.5" fill={inkSoft} />
        </g>
      );

    case "phone":
      return (
        <g>
          <rect
            x="32"
            y="20"
            width="56"
            height="120"
            rx="12"
            fill="none"
            stroke={ink}
            strokeWidth="3"
            opacity="0.85"
          />
          <rect x="52" y="26" width="16" height="4" rx="2" fill={ink} opacity="0.7" />
          <circle cx="60" cy="70" r="14" fill={ink} opacity="0.8" />
          <path
            d="M40 128 C40 110 49 100 60 100 C71 100 80 110 80 128 Z"
            fill={ink}
            opacity="0.6"
          />
        </g>
      );

    case "orbit":
      return (
        <g>
          <ellipse
            cx="60"
            cy="92"
            rx="42"
            ry="15"
            fill="none"
            stroke={ink}
            strokeWidth="3"
            opacity="0.5"
          />
          <Product ink={ink} light={light} x={48} y={48} width={24} height={50} />
          <circle cx="102" cy="92" r="5" fill={ink} opacity="0.8" />
        </g>
      );

    case "object":
    default:
      return (
        <g>
          <ellipse cx="60" cy="126" rx="30" ry="7" fill={ink} opacity="0.25" />
          <Product ink={ink} light={light} x={44} y={48} width={32} height={78} />
        </g>
      );
  }
}

/** The stand-in bottle/box every motif reuses, so a product reads as the same
 *  object across the whole catalog. */
function Product({
  ink,
  light,
  x,
  y,
  width,
  height,
}: {
  ink: string;
  light: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const capWidth = width * 0.45;
  return (
    <g>
      <rect
        x={x + (width - capWidth) / 2}
        y={y - height * 0.14}
        width={capWidth}
        height={height * 0.16}
        rx={2}
        fill={ink}
        opacity="0.7"
      />
      <rect x={x} y={y} width={width} height={height} rx={width * 0.22} fill={ink} />
      <rect
        x={x + width * 0.16}
        y={y + height * 0.3}
        width={width * 0.68}
        height={height * 0.34}
        rx={2}
        fill={light}
        opacity="0.55"
      />
    </g>
  );
}

/** Rough perceptual lightness of a #rgb / #rrggbb color, 0–1. */
function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return 0.5;
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
