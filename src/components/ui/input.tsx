import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-border-subtle bg-surface-dark px-4 py-3 font-sans text-input text-ink-soft",
        "placeholder:text-muted transition-[border-color,background-color]",
        "focus:border-border-strong focus:bg-surface-3 focus:outline-none",
        "disabled:border-border-subtle disabled:bg-surface disabled:text-muted disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full resize-y rounded-xl border border-border-subtle bg-surface-dark px-4 py-3 font-sans text-body-sm text-ink-soft",
      "placeholder:text-muted transition-[border-color,background-color]",
      "focus:border-border-strong focus:bg-surface-3 focus:outline-none",
      "disabled:border-border-subtle disabled:bg-surface disabled:text-muted disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-border-subtle bg-surface-dark px-4 py-3 font-sans text-[14px] leading-[20px] font-normal text-ink-soft",
      "transition-[border-color,background-color] focus:border-border-strong focus:bg-surface-3 focus:outline-none",
      "disabled:border-border-subtle disabled:bg-surface disabled:text-muted disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-2 block text-label font-medium text-ink-soft", className)}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1.5 text-caption text-accent">{children}</p>;
}
