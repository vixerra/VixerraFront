"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-5 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-line">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-brand" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block size-4 rounded-full border-2 border-brand bg-white shadow-raised focus-visible:outline-none"
        aria-label="Value"
      />
    </SliderPrimitive.Root>
  );
}
