import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "circular" | "accent" | "glass";
export type ButtonSize = "default" | "sm" | "icon" | "icon-circular";

// Focus ring comes from the global :focus-visible rule in globals.css —
// no need to repeat it on every interactive primitive. font-display (Space
// Grotesk) rather than the body sans gives every button in the app the
// same bit of typographic character as the headlines, so CTAs read as
// "designed" even in plain lists of Cancel/Save actions.
const base =
  "font-display inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-label font-semibold " +
  "transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out disabled:pointer-events-none disabled:opacity-40";

// primary = solid white pill, black text — brand-silver never fills a
// button, it's reserved for text/badge/link accents (see globals.css) so
// it stays legible as emphasis rather than becoming the default chrome.
// secondary = ghost pill: transparent + translucent white border.
// accent = the one deliberate exception to "brand never fills a button":
// reserved for the single highest-emphasis CTA on a screen (hero, generate
// submit, upgrade/recharge). In a monochrome palette this sits one step
// BELOW the white primary pill rather than shouting past it — silver next
// to white is a difference of material, not of volume, which is the whole
// reason the two can coexist on a screen without fighting. Its label is
// text-on-brand (black), not white: silver is a light metal, so
// white-on-silver would be illegible — see --color-on-brand.
const variants: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-white text-black shadow-[0_0_20px_rgb(255_255_255_/_0.1)] hover:bg-white/90 hover:shadow-[0_0_30px_rgb(255_255_255_/_0.15)] hover:scale-[1.02] active:scale-[0.98] disabled:bg-line disabled:text-muted disabled:shadow-none disabled:hover:scale-100",
  secondary:
    "border border-line bg-transparent text-ink hover:bg-white/5 hover:border-border-strong active:scale-[0.98] disabled:text-muted",
  ghost:
    "rounded-full border-0 bg-transparent text-ink-soft hover:bg-white/8 hover:text-ink active:bg-white/12",
  circular:
    "border-0 rounded-full bg-white/5 text-muted hover:bg-white/10 hover:text-ink-soft active:scale-95",
  accent:
    "border-0 bg-brand text-on-brand shadow-glow-md hover:bg-brand-hover hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98] active:bg-brand-active disabled:opacity-40 disabled:hover:scale-100",
  // Frosted "liquid glass" pill — see .btn-glass in globals.css for the
  // gradient-reflection border. Used where a CTA needs to sit directly on
  // top of busy media (hero) rather than a flat surface, without competing
  // with the solid-white primary pill's visual weight. `relative` is
  // required here (not baked into .btn-glass itself — see its comment) so
  // the ::before gradient-border overlay has a containing block to anchor
  // to; a call site that's already `fixed`/`absolute` for other reasons
  // (e.g. BackToTop) satisfies that without needing this variant at all.
  glass:
    "btn-glass relative border-0 text-white hover:bg-white/12 hover:scale-[1.02] active:scale-[0.98]",
};

const sizes: Record<ButtonSize, string> = {
  default: "px-7 py-3.5 sm:px-6 sm:py-3",
  sm: "px-4 py-2",
  icon: "size-11 p-0 sm:size-10",
  "icon-circular": "size-11 p-0 sm:size-9",
};

export function buttonVariants(
  options: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {},
) {
  const { variant = "primary", size = "default", className } = options;
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
