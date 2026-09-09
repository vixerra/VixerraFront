import { cn } from "@/lib/utils";

/**
 * Dramatic horizontal section divider — a blurred silver→cyan band (see
 * .light-beam in globals.css) instead of a plain border-t hairline. Used
 * sparingly, between sections that want a stronger visual break than the
 * usual border-t border-line treatment.
 */
export function LightBeam({ className }: { className?: string }) {
  return <div className={cn("light-beam", className)} aria-hidden="true" />;
}
