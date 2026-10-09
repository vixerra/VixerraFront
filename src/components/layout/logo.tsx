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
  href = "/",
}: {
  className?: string;
  iconOnly?: boolean;
  compact?: boolean;
  /** Where the lockup leads. Both callers on the app host override it: the
   *  shell sends it to the dashboard, the auth pages to the public site's
   *  absolute URL. A relative "/" from there is a cross-host link, which the
   *  browser refuses to follow as a prefetch — see src/lib/hosts.ts. */
  href?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-ink", className)}>
      {/* Ink glyph on an electric-yellow tile; currentColor so the glyph
          follows --color-on-brand. */}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand",
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
