"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  /** What actually happens, and whether it can be undone. Worth writing:
   *  "Are you sure?" on its own tells the reader nothing they didn't
   *  already know when they clicked. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" paints the confirm button red — for anything that destroys
   *  data. "default" is for the merely consequential (publishing, moving
   *  someone's money around), which shouldn't look like a delete. */
  tone?: "default" | "danger";
};

type ConfirmContextValue = {
  /** Resolves true if the user confirmed, false on cancel/escape/outside
   *  click. Never rejects, so call sites can just `if (!(await confirm(…))) return;`. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * A promise-returning confirmation dialog, mounted once at the root.
 *
 * A hook rather than a per-call-site `<Modal>` because the ~15 destructive
 * actions in this app live in a dozen different components, several of them
 * inside an already-open dialog (the gallery preview). Threading open/target
 * state through each of those would be a lot of near-identical bookkeeping
 * for one question.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openedAtRef = useRef(0);

  /**
   * Swallows the dismissal that the *opening* click causes.
   *
   * This dialog is opened from an ordinary button rather than a
   * Dialog.Trigger, so by the time the layer mounts the mouse interaction
   * that opened it is still in flight — Radix sees its tail end as an
   * interaction outside the dialog and closes it again immediately. (Only
   * with a real pointer: a synthetic .click() never reproduces it.) Escape
   * and genuine outside clicks are both far slower than this window.
   */
  const ignoreOpeningClick = (event: { preventDefault: () => void }) => {
    if (Date.now() - openedAtRef.current < 350) event.preventDefault();
  };

  const settle = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setPending(null);
  }, []);

  const confirm = useCallback<ConfirmContextValue["confirm"]>(
    (options) => {
      // A second prompt while one is open would strand the first promise
      // forever — its caller is sitting in an `await`. Treat it as declined.
      resolveRef.current?.(false);
      resolveRef.current = null;
      openedAtRef.current = Date.now();
      setPending(options);
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    },
    [],
  );

  // An unmount mid-prompt (route change, parent tearing down) would do the
  // same thing, so release the caller rather than leaving it hanging.
  useEffect(() => () => resolveRef.current?.(false), []);

  const danger = pending?.tone === "danger";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog.Root open={pending !== null} onOpenChange={(open) => !open && settle(false)}>
        <Dialog.Portal>
          {/* Above the toast layer (z-70) and the gallery preview (z-60):
              this is asked from inside both, and a question hidden behind
              the thing that raised it is a deadlock for the user. */}
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-overlay/80 backdrop-blur-sm" />
          <Dialog.Content
            className={cn(
              "fixed top-1/2 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
              "rounded-xl border border-line bg-surface-2 p-6 shadow-modal focus:outline-none",
            )}
            // Land on Cancel, not the destructive button — a stray Enter
            // right after the click that opened this shouldn't confirm it.
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              cancelRef.current?.focus();
            }}
            onPointerDownOutside={ignoreOpeningClick}
            onInteractOutside={ignoreOpeningClick}
            // Never close on a focus change. When this is raised from inside
            // another modal (the gallery preview), that dialog's focus trap
            // pulls focus back to itself a beat after this one mounts —
            // which read as "the user clicked away" and silently cancelled
            // the prompt. A question this consequential closes on an answer,
            // Escape, or a deliberate click outside; nothing else.
            onFocusOutside={(event) => event.preventDefault()}
          >
            <div className="flex gap-4">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  danger ? "bg-accent/10 text-accent" : "bg-white/5 text-ink-soft",
                )}
              >
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-subheading font-semibold text-ink">
                  {pending?.title ?? ""}
                </Dialog.Title>
                {pending?.description && (
                  <Dialog.Description className="mt-2 text-body-sm text-muted">
                    {pending.description}
                  </Dialog.Description>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button ref={cancelRef} variant="secondary" size="sm" onClick={() => settle(false)}>
                {pending?.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className={cn(
                  danger &&
                    "bg-accent text-white shadow-none hover:bg-accent/90 hover:shadow-none",
                )}
                onClick={() => settle(true)}
              >
                {pending?.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}
