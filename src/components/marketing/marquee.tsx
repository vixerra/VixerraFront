import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pure-CSS infinite marquee: the track is rendered twice back-to-back and
 * translated by exactly -50%, so it loops seamlessly. No JS, transform-only
 * animation (GPU-cheap), pauses on hover, and collapses to a static row/
 * column for prefers-reduced-motion.
 */
export function Marquee({
  children,
  className,
  direction = "horizontal",
}: {
  children: ReactNode;
  className?: string;
  direction?: "horizontal" | "vertical";
}) {
  const vertical = direction === "vertical";
  return (
    <div
      className={cn(
        "group overflow-hidden",
        vertical
          ? "[mask-image:linear-gradient(to_bottom,transparent,black_5%,black_95%,transparent)]"
          : "[mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]",
        className,
      )}
    >
      <div
        className={cn(
          vertical
            ? "flex h-max flex-col motion-safe:animate-marquee-vertical"
            : "flex w-max motion-safe:animate-marquee",
          "motion-safe:group-hover:[animation-play-state:paused]",
        )}
      >
        <div className={vertical ? "flex shrink-0 flex-col items-center gap-3 pb-3" : "flex shrink-0 items-center gap-3 pr-3"}>
          {children}
        </div>
        <div
          className={vertical ? "flex shrink-0 flex-col items-center gap-3 pb-3" : "flex shrink-0 items-center gap-3 pr-3"}
          aria-hidden="true"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
