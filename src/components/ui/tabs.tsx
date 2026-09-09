"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-6 overflow-x-auto border-b border-line", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "shrink-0 border-b-2 border-transparent pb-3.5 text-label text-muted transition-colors",
        "hover:text-brand/80",
        "data-[state=active]:border-brand data-[state=active]:text-brand",
        "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
