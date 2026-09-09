"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Lock, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreatorSuiteUpsell, useCreatorSuite } from "@/components/upgrade-gate";
import { CreatorTools } from "./creator-tools";

/**
 * The Creator tools entry point: one icon, one dedicated surface.
 *
 * Publishing is its own job, not a detail of the piece — it wants a caption,
 * tags, destinations and a schedule, which is more than fits sensibly inside
 * a details panel or under a result card. So the icon opens a dialog that
 * owns the whole composer, and the surfaces that host it only have to place
 * a button.
 *
 * The `Send` mark is deliberately distinct from `Share2`, which already
 * means "share to the community gallery" elsewhere in this modal — two
 * different destinations shouldn't wear the same icon.
 */
export function PublishButton({
  generationId,
  isVideo,
  variant = "icon",
  label,
  buttonVariant = "secondary",
  open: controlledOpen,
  onOpenChange,
  className,
}: {
  generationId: string;
  isVideo: boolean;
  /** "icon" for a crowded action row, "labelled" where there's room for the
   *  word and the action deserves the emphasis. */
  variant?: "icon" | "labelled";
  /** Overrides the labelled variant's wording where a surface needs to name
   *  the destination rather than the verb. */
  label?: string;
  buttonVariant?: "secondary" | "accent";
  /** Optional controlled mode. The export dialog uses it to open the
   *  composer by itself the moment a save finishes, so "save and publish"
   *  is one press rather than two. Uncontrolled everywhere else. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  // Locked plans keep the button and the dialog: hiding the entry point
  // would leave the tool invisible to exactly the people it is being sold
  // to. The dialog opens onto the upsell instead of the composer, and the
  // API refuses the publish endpoints regardless (routes/social.ts).
  const { allowed: canPublish, isLoading: planLoading } = useCreatorSuite();
  const locked = !planLoading && !canPublish;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const openedAtRef = useRef(0);

  /**
   * Swallows the dismissal caused by opening this from inside another modal
   * — the gallery preview. That dialog's focus trap reclaims focus a beat
   * after this one mounts, which Radix reads as an interaction outside and
   * closes it again. Same fix, and the same reason, as the confirm dialog.
   */
  const ignoreOpeningInteraction = (event: { preventDefault: () => void }) => {
    if (Date.now() - openedAtRef.current < 350) event.preventDefault();
  };

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="secondary"
          size="icon"
          className={className}
          aria-label={locked ? "Publish to social — Creator plan" : "Publish to social"}
          title={locked ? "Publishing is included on Creator and Studio" : "Publish to social"}
          onClick={() => {
            openedAtRef.current = Date.now();
            setOpen(true);
          }}
        >
          {locked ? <Lock className="size-4" /> : <Send className="size-4" />}
        </Button>
      ) : (
        <Button
          variant={buttonVariant}
          className={className}
          onClick={() => {
            openedAtRef.current = Date.now();
            setOpen(true);
          }}
        >
          {locked ? (
            <Lock className="size-4" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {label ?? "Publish"}
        </Button>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          {/* Above the gallery preview (z-60) and the toast layer (z-70),
              below the confirm dialog (z-80/90) — cancelling a scheduled
              post asks from in here. */}
          <Dialog.Overlay className="fixed inset-0 z-[72] bg-overlay/80 backdrop-blur-sm" />
          <Dialog.Content
            className={cn(
              "fixed top-1/2 left-1/2 z-[74] flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col",
              "rounded-2xl border border-line bg-surface-2 shadow-modal focus:outline-none",
            )}
            onPointerDownOutside={ignoreOpeningInteraction}
            onInteractOutside={ignoreOpeningInteraction}
            onFocusOutside={(event) => event.preventDefault()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle p-5">
              <div>
                <Dialog.Title className="font-display text-subheading font-bold text-ink">
                  Creator tools
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-body-sm text-muted">
                  {locked
                    ? "Publishing from the app is included on Creator and Studio."
                    : "Post this straight to your channels, now or on a schedule."}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>

            {/* The composer scrolls, the header and its close button don't —
                a long list of past posts shouldn't push the way out of the
                dialog off-screen. */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {locked ? (
                <CreatorSuiteUpsell
                  feature="social-publishing"
                  className="border-0 bg-transparent py-6 shadow-none"
                />
              ) : (
                <CreatorTools generationId={generationId} isVideo={isVideo} />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
