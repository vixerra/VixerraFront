"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-first settings drawer that slides up from the bottom edge (vs.
 * Modal's centered card) — reads as a native app sheet, matching e.g.
 * Artlist's mobile generation settings. Used to collapse the composer's
 * pill row into a single "Options" trigger on narrow viewports instead of
 * a horizontally-scrolling row of 6-7 tiny controls.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "animate-sheet-up fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto rounded-t-3xl",
            "border-t border-line bg-surface-2 shadow-modal focus:outline-none",
            // env(safe-area-inset-bottom) clears the home-indicator bar on
            // notched phones — without it the last row sits flush against it.
            "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <Dialog.Title className="text-subheading font-semibold text-ink">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-ink-soft"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <div className="px-5 pb-2">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
