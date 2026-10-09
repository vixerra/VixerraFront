import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "circular"
  | "accent"
  | "glass";
export type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-circular";

// Focus ring comes from the global :focus-visible rule in globals.css.
// Small, bold, uppercase and tracked-out with a 16px radius — the
// comfy.org button. Icon-only sizes drop the tracking so glyphs center.
const base =
  "font-sans inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[12px] leading-none font-bold tracking-[0.06em] uppercase " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-40";

// primary   = solid electric-yellow fill, ink label — the action color.
// accent    = the same fill plus a yellow halo, for the single loudest CTA
//             on a screen (hero, generate submit, upgrade).
// outline   = yellow hairline + yellow label — the partner CTA next to a
//             primary (comfy's "Desktop" next to "Try free").
// secondary = quiet white/4% pill with stone label (comfy's "Sign in") —
//             Cancel, Back, secondary actions in forms.
// ghost     = no chrome until hover.
// glass     = the outline treatment on a frosted ink pill, for CTAs sitting
//             directly on media. `relative` anchors .btn-glass's ::before.
const variants: Record<ButtonVariant, string> = {
  primary:
    "border-0 bg-brand text-on-brand hover:bg-brand-hover active:scale-[0.98] active:bg-brand-active",
  accent:
    "border-0 bg-brand text-on-brand shadow-glow-md hover:bg-brand-hover hover:shadow-glow-lg active:scale-[0.98] active:bg-brand-active",
  outline:
    "border border-brand/90 bg-transparent text-brand hover:border-brand hover:bg-brand/10 active:scale-[0.98]",
  secondary:
    "border border-line bg-ink/[0.04] text-muted hover:border-border-strong hover:bg-ink/[0.08] hover:text-ink active:scale-[0.98]",
  ghost:
    "border-0 bg-transparent text-muted hover:bg-ink/[0.06] hover:text-ink active:bg-ink/10",
  circular:
    "rounded-full border-0 bg-ink/[0.06] text-muted tracking-normal hover:bg-ink/10 hover:text-ink active:scale-95",
  glass:
    "btn-glass relative border-0 text-brand hover:bg-brand/10 active:scale-[0.98]",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-11 px-6 sm:h-10",
  sm: "h-9 px-4 text-[11px]",
  lg: "h-12 px-7 text-[13px] sm:h-[52px] sm:px-8",
  icon: "size-11 p-0 tracking-normal sm:size-10",
  "icon-circular": "size-11 p-0 tracking-normal sm:size-9",
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
