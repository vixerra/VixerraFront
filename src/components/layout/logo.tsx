import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * `compact` shrinks the mark and wordmark for the app sidebar, where the
 * marketing-sized lockup (32px mark + 22px wordmark) crowds a 240px rail.
 */
export function Logo({
  className,
  iconOnly = false,
  compact = false,
}: {
  className?: string;
  iconOnly?: boolean;
  compact?: boolean;
}) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 text-ink", className)}>
      {/* The mark stays silver while the wordmark's accent goes lime: the
          identity belongs to the monochrome base, and the signal colors
          are for things you can act on (see globals.css). currentColor
          rather than a hardcoded #fff because silver is a light fill, so
          the glyph takes the black on-brand ink. */}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-silver text-on-brand",
          compact ? "size-7" : "size-8",
        )}
      >
        <svg
          width={compact ? 16 : 18}
          height={compact ? 16 : 18}
          viewBox="-8 -8 116 116"
          fill="none"
          aria-hidden="true"
        >
          <rect x="37" y="18" width="26" height="64" rx="7" fill="currentColor" fillOpacity="0.5" transform="rotate(-20, 50, 82)" />
          <rect x="37" y="18" width="26" height="64" rx="7" fill="currentColor" transform="rotate(20, 50, 82)" />
        </svg>
      </span>
      {!iconOnly && (
        <span
          className={cn(
            "font-display font-bold tracking-tight",
            compact ? "text-body-lg leading-none" : "text-feature-title",
          )}
        >
          <span className="text-ink">Vix</span>
          <span className="text-brand">lens</span>
        </span>
      )}
    </Link>
  );
}
