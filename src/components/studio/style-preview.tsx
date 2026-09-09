"use client";

import { useId } from "react";
import type { MarketingStyle, StyleMotif } from "@/lib/marketing-styles";
import { cn } from "@/lib/utils";

/**
 * The artwork on a style card.
 *
 * Drawn, not photographed: the reference libraries this picker is modelled on
 * show a real sample render per style, and we have none — every sample we
 * could ship would either be someone else's work or a claim ("this is what
 * this style produces") the catalog can't back. An abstract tile built from
 * the style's own palette + motif says "these are different looks" honestly,
 * costs no bytes, and means adding a style stays a one-object edit in
 * marketing-styles.ts.
 */
export function StylePreview({
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
