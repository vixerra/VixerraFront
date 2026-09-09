import { cn } from "@/lib/utils";

/**
 * The "working on it" mark for the generate page — an animated line icon of
 * the thing being made: a film frame for video, a photo for image.
 *
 * Deliberately not a spinner over a percentage bar. The provider reports
 * progress in coarse jumps and sits at 0 for most of a render, so the number
 * was either frozen or lying; a mark that draws itself says "a model is
 * making this right now" without claiming to know how far along it is.
 *
 * Both variants are one 72px SVG: the outline traces itself on a loop, the
 * solid detail inside breathes, and two sparks twinkle off the corner.
 * Everything is gated on motion-safe:, so reduced motion gets the same icon
 * held still.
 */

/** Rough path lengths, used to seed each stroke's dash cycle. They only need
 *  to be close — a value under the real length just shortens the trailing
 *  gap, which reads fine at this size. */
const FRAME_DASH = 132;
const RIDGE_DASH = 44;

/** Two AI sparks, offset so they alternate rather than blink together. */
function Sparks() {
  return (
    <>
      {[
        { d: "M40 8 L41.4 11.6 L45 13 L41.4 14.4 L40 18 L38.6 14.4 L35 13 L38.6 11.6 Z", delay: 0 },
        { d: "M9 30 L9.9 32.1 L12 33 L9.9 33.9 L9 36 L8.1 33.9 L6 33 L8.1 32.1 Z", delay: 1100 },
      ].map((spark) => (
        <path
          key={spark.d}
          d={spark.d}
          fill="currentColor"
          className="text-accent-amber motion-safe:animate-sparkle-twinkle"
          style={{
            animationDelay: `${spark.delay}ms`,
            // SVG children scale from the user-space origin by default, which
            // would fling these off-centre — box them first.
            transformBox: "fill-box",
            transformOrigin: "center",
          }}
        />
      ))}
    </>
  );
}

export function GenerationLoader({
  isVideo,
  className,
}: {
  isVideo: boolean;
  className?: string;
}) {
  const trace = "motion-safe:animate-icon-trace";
  const breathe = "motion-safe:animate-icon-pulse";

  return (
    <div className={cn("relative flex items-center justify-center", className)} aria-hidden="true">
      {/* Soft silver bloom behind the mark — flat colour plus blur, no
        * gradient fill (see the palette note in globals.css). */}
      <span className="pointer-events-none absolute size-24 rounded-full bg-brand opacity-20 blur-2xl" />

      <svg
        viewBox="0 0 48 48"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative size-18 text-brand"
      >
        {/* Ghost outline underneath, so the icon still reads as a shape
          * during the part of the cycle where the traced stroke is gone. */}
        <rect
          x="6"
          y="12"
          width="36"
          height="24"
          rx="5"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="2.5"
        />
        <rect
          x="6"
          y="12"
          width="36"
          height="24"
          rx="5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={FRAME_DASH}
          className={trace}
          style={{ "--dash": FRAME_DASH } as React.CSSProperties}
        />

        {isVideo ? (
          // Play triangle, breathing in the middle of the frame.
          <path
            d="M21 19.5 L30 24 L21 28.5 Z"
            fill="currentColor"
            className={breathe}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        ) : (
          <>
            {/* Sun, then a ridge line that draws itself across the frame —
              * the photo composing itself inside the border. The ghost copy
              * underneath keeps the shape readable at the point in the cycle
              * where the traced stroke has run off the end. */}
            <circle
              cx="16.5"
              cy="19.5"
              r="2.5"
              fill="currentColor"
              className={breathe}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
            <path
              d="M9 32 L18 24 L25 29.5 L31 25 L39 32"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="2.5"
            />
            <path
              d="M9 32 L18 24 L25 29.5 L31 25 L39 32"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={RIDGE_DASH}
              className={trace}
              style={{ "--dash": RIDGE_DASH, animationDelay: "400ms" } as React.CSSProperties}
            />
          </>
        )}

        <Sparks />
      </svg>
    </div>
  );
}
