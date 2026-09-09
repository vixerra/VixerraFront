import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 text-ink", className)}>
      {/* The mark stays silver while the wordmark's accent goes lime: the
          identity belongs to the monochrome base, and the signal colors
          are for things you can act on (see globals.css). currentColor
          rather than a hardcoded #fff because silver is a light fill, so
          the glyph takes the black on-brand ink. */}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-silver text-on-brand">
        <svg width="18" height="18" viewBox="-8 -8 116 116" fill="none" aria-hidden="true">
          <rect x="37" y="18" width="26" height="64" rx="7" fill="currentColor" fillOpacity="0.5" transform="rotate(-20, 50, 82)" />
          <rect x="37" y="18" width="26" height="64" rx="7" fill="currentColor" transform="rotate(20, 50, 82)" />
        </svg>
      </span>
      {!iconOnly && (
        <span className="font-display text-feature-title font-bold tracking-tight">
          <span className="text-ink">Vix</span>
          <span className="text-brand">erra</span>
        </span>
      )}
    </Link>
  );
}
