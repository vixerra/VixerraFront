import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "success" | "accent" | "outline" | "brand";

const base =
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] leading-4 font-semibold tracking-wide uppercase w-fit";

// Doc's badges/pills are deliberately restrained — plain translucent-white
// tags by default (Rating Badge, Tag Badge), never a gradient fill. `brand`
// is a soft silver tint for the rare cases that still want emphasis (e.g. a
// "New" pill), not the loud gradient-fill it used to be. The status
// variants are the ones carrying actual colour here — see the "occasional
// color" note in globals.css.
const variants: Record<BadgeVariant, string> = {
  neutral: "border border-transparent bg-white/5 text-muted",
  success: "border border-success/30 bg-success/15 text-success",
  accent: "border border-accent/30 bg-accent/15 text-accent",
  outline: "border border-line bg-transparent text-muted",
  brand: "border border-brand/20 bg-brand/10 text-brand",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn(base, variants[variant], className)} {...props} />;
}
