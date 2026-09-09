"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const DropdownRoot = DropdownMenu.Root;
export const DropdownTrigger = DropdownMenu.Trigger;

export function DropdownContent({
  children,
  align = "end",
  side,
  className,
}: {
  children: ReactNode;
  align?: "start" | "end" | "center";
  /** Left unset by default so Radix's own collision detection picks the
   * side with more room. Pass "top" for triggers anchored near the bottom
   * of the viewport (e.g. the composer's mobile row) to force it — that
   * trigger sits close enough to the edge that a stray scroll container or
   * viewport-detection edge case can otherwise let it render downward and
   * get clipped by the fixed composer bar below it. */
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        side={side}
        sideOffset={8}
        className={cn(
          "z-[65] min-w-[200px] rounded-lg border border-line bg-surface-3 py-2 text-ink shadow-floating",
          className,
        )}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function DropdownItem({ className, ...props }: ComponentProps<typeof DropdownMenu.Item>) {
  return (
    <DropdownMenu.Item
      className={cn(
        "cursor-pointer px-4 py-3 text-label text-ink-soft outline-none transition-colors",
        "data-[highlighted]:bg-dropdown-hover data-[highlighted]:text-brand",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-line" />;
}

export function DropdownLabel({ className, ...props }: ComponentProps<typeof DropdownMenu.Label>) {
  return (
    <DropdownMenu.Label
      className={cn("px-4 py-2 text-caption text-muted", className)}
      {...props}
    />
  );
}
