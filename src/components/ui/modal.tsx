"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[60] max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
            "overflow-y-auto rounded-xl border border-line bg-surface-2 p-6 shadow-modal focus:outline-none",
            className,
          )}
        >
          {title ? (
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-subheading font-semibold text-ink">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-body-sm text-muted">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close dialog">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
          ) : (
            <Dialog.Title className="sr-only">Dialog</Dialog.Title>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
