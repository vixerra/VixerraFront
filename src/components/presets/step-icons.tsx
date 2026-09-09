import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The three animated marks for the preset studio's "How it works" walkthrough.
 *
 * Each one acts out its own step — a card being chosen out of a row, a photo
 * dropping into an empty frame, a finished clip being pulled down — rather
 * than being a static glyph next to the text. That's the whole reason they
 * exist instead of the lucide icons that were here before: the panel is
 * teaching a three-step flow, and a mark that performs the step carries more
 * of that than a wand outline does.
 *
 * Built the same way as generation-loader.tsx: one 48-unit viewBox, line art
 * in the brand colour over a soft bloom, transform/opacity-only keyframes
 * declared in globals.css and applied with motion-safe:, so reduced motion
 * gets the same drawing held still. See the --animate-preset-select /
 * -drop-into-frame / -arrow-dip block there.
 */

const FRAME_DASH = 120;

/** SVG children scale from the user-space origin by default, which flings a
 * scaled child off-centre — every animated node here boxes itself first. */
const centered: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

function Mark({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} aria-hidden="true">
      {/* Same flat-colour-plus-blur bloom as the generation loader — no
          gradient fill, see the palette note in globals.css. */}
      <span className="pointer-events-none absolute size-24 rounded-full bg-brand opacity-20 blur-2xl" />
      <svg
        viewBox="0 0 48 48"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative size-16 text-brand"
      >
        {children}
      </svg>
    </div>
  );
}

/** Step 1 — three preset cards, the middle one lifting out as the chosen one. */
export function PickPresetMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      {[
        { x: 6, dimmed: true },
        { x: 18.5, dimmed: false },
        { x: 31, dimmed: true },
      ].map((card) => (
        <rect
          key={card.x}
          x={card.x}
          y={13}
          width={11}
          height={22}
          rx={3}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeOpacity={card.dimmed ? 0.3 : 1}
          className={card.dimmed ? undefined : "motion-safe:animate-preset-select"}
          style={centered}
        />
      ))}
      {/* Tap ripple under the chosen card — the "pick" itself. */}
      <circle
        cx={24}
        cy={40}
        r={2}
        fill="currentColor"
        className="text-accent-amber motion-safe:animate-status-pulse"
        style={centered}
      />
    </Mark>
  );
}

/** Step 2 — an empty dashed slot with a photo dropping into it. */
export function UploadImageMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      {/* The slot. Its dashes are static: a dashed border that also crawled
          would fight the thing actually moving inside it. */}
      <rect
        x={7}
        y={11}
        width={34}
        height={26}
        rx={5}
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeWidth={2.5}
        strokeDasharray="5 4"
      />
      {/* The photo landing in it — frame, sun and horizon move as one group. */}
      <g className="motion-safe:animate-drop-into-frame" style={centered}>
        <rect
          x={13}
          y={16}
          width={22}
          height={16}
          rx={3}
          stroke="currentColor"
          strokeWidth={2.5}
        />
        <circle cx={19} cy={21.5} r={1.8} fill="currentColor" />
        <path d="M14.5 30 L20 25 L24 27.5 L28.5 23.5 L33.5 30" stroke="currentColor" strokeWidth={2.5} />
      </g>
    </Mark>
  );
}

/** Step 3 — the finished clip, traced, with the download arrow pulling it down. */
export function DownloadResultMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      {/* Ghost frame underneath keeps the shape readable at the point in the
          trace cycle where the drawn stroke has run off the end. */}
      <rect x={7} y={7} width={34} height={22} rx={5} stroke="currentColor" strokeOpacity={0.3} strokeWidth={2.5} />
      <rect
        x={7}
        y={7}
        width={34}
        height={22}
        rx={5}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeDasharray={FRAME_DASH}
        className="motion-safe:animate-icon-trace"
        style={{ "--dash": FRAME_DASH } as CSSProperties}
      />
      <path
        d="M21 13.5 L28 18 L21 22.5 Z"
        fill="currentColor"
        className="motion-safe:animate-icon-pulse"
        style={centered}
      />

      {/* Arrow travelling down onto the tray line below the frame. */}
      <g className="motion-safe:animate-arrow-dip" style={centered}>
        <path d="M24 32 L24 39" stroke="currentColor" strokeWidth={2.5} />
        <path d="M20.5 35.5 L24 39 L27.5 35.5" stroke="currentColor" strokeWidth={2.5} />
      </g>
      <path d="M16 42.5 L32 42.5" stroke="currentColor" strokeOpacity={0.3} strokeWidth={2.5} />
    </Mark>
  );
}
