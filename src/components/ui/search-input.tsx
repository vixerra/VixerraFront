import { Search } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        className={cn(
          "w-full rounded-xl border border-border-subtle bg-transparent py-2 px-2 pl-8 font-sans text-input text-ink-soft",
          "placeholder:text-muted transition-[border-color] focus:border-border-strong focus:outline-none",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
SearchInput.displayName = "SearchInput";
