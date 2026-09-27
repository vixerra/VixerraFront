"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { useMe } from "@/hooks/use-me";
import {
  needsWatermark,
  WATERMARK_FONT_SCALE,
  WATERMARK_GAP_EM,
  WATERMARK_MARK_EM,
  WATERMARK_OPACITY,
  WATERMARK_TEXT,
} from "@/lib/watermark";

/** Whether the signed-in viewer's OWN results carry the watermark. Someone
 *  else's work on the community feed isn't the viewer's plan to judge, so
 *  callers only apply it where the viewer is the creator. */
export function useResultWatermark(): boolean {
  const { data: me } = useMe();
  return needsWatermark(me?.effectiveTier);
}

type Box = { left: number; top: number; width: number; height: number };

/**
 * The Free plan's watermark over a result on screen — the same lockup
 * lib/watermark-burn.ts draws into the downloaded file, at the same size.
 *
 * With `mediaRef` it sits exactly on that <video>/<img> (which must share
 * this overlay's positioned parent): an object-contained result rarely fills
 * its frame, and the mark belongs to the picture's center, sized off the
 * picture's short side. Without it, it fills the positioned parent, which is
 * right for a tile the media covers edge to edge.
 *
 * pointer-events-none, so the player's own controls stay usable underneath.
 */
export function ResultWatermark({ mediaRef }: { mediaRef?: RefObject<HTMLElement | null> }) {
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const el = mediaRef?.current;
    if (!el) return;
    const update = () =>
      setBox({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    update();
    // The media resizes when its metadata lands (a <video> is 300x150 until
    // then); the parent resizing re-centers it without resizing it.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.offsetParent) observer.observe(el.offsetParent);
    return () => observer.disconnect();
  }, [mediaRef]);

  if (mediaRef && !box) return null;

  // The box is a size container, so cqmin is 1% of the media's short side —
  // the unit WATERMARK_FONT_SCALE is defined in.
  const frame: CSSProperties = { ...(box ?? { inset: 0 }), containerType: "size" };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute flex items-center justify-center select-none"
      style={frame}
    >
      <div
        className="flex items-center font-display leading-none font-bold whitespace-nowrap text-white"
        style={{
          fontSize: `${WATERMARK_FONT_SCALE * 100}cqmin`,
          gap: `${WATERMARK_GAP_EM}em`,
          opacity: WATERMARK_OPACITY,
          filter: "drop-shadow(0 0 0.125em rgba(0, 0, 0, 0.45))",
        }}
      >
        {/* The mark from components/layout/logo.tsx, in white. */}
        <svg
          viewBox="-8 -8 116 116"
          fill="currentColor"
          style={{ width: `${WATERMARK_MARK_EM}em`, height: `${WATERMARK_MARK_EM}em` }}
        >
          <rect x="37" y="18" width="26" height="64" rx="7" fillOpacity="0.5" transform="rotate(-20, 50, 82)" />
          <rect x="37" y="18" width="26" height="64" rx="7" transform="rotate(20, 50, 82)" />
        </svg>
        <span>{WATERMARK_TEXT}</span>
      </div>
    </div>
  );
}
