import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "standard" | "compact" | "feature" | "glass";

const variants: Record<CardVariant, string> = {
  standard:
    "rounded-2xl border border-line bg-surface-2 p-6 shadow-card sm:p-8 transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:border-border-strong hover:bg-surface-3",
  compact: "rounded-2xl border border-line bg-surface-2 p-6 shadow-card",
  // Doc's Feature Card spec exactly: secondary bg at rest, shifts to
  // tertiary + stronger border + bigger shadow on hover — no lift/scale.
  feature:
    "rounded-2xl border border-line bg-surface-2 px-6 py-10 text-ink transition-[background-color,border-color] duration-300 ease-out hover:border-border-strong hover:bg-surface-3 sm:px-8 sm:py-12",
  // Frosted glass panel — floating/overlay surfaces that sit on top of
  // imagery or gradients (docked composer, canvas toolbars, stat callouts)
  // where an opaque bg-surface-2 card would look flat. Reuses the .glass
  // utility's blur/translucency, just as a Card variant.
  glass:
    "glass rounded-2xl p-6 shadow-floating",
};

export function Card({
  variant = "standard",
  className,
  ...props
}: ComponentProps<"div"> & { variant?: CardVariant }) {
  return <div className={cn(variants[variant], className)} {...props} />;
}
