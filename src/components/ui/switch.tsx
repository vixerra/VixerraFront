"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border border-line bg-surface-3 transition-colors",
        "data-[state=checked]:border-brand data-[state=checked]:bg-brand",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* The thumb flips colour with the track: white reads on the dark
          unchecked track, but the checked track is a light silver, where a
          white thumb nearly disappears — so it takes the black on-brand
          ink there instead. */}
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-4 translate-x-1 rounded-full bg-white shadow-raised",
          "transition-[transform,background-color] data-[state=checked]:translate-x-6 data-[state=checked]:bg-on-brand",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
