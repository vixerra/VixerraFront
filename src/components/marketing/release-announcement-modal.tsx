"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SHOWCASE_VIDEOS } from "@/lib/showcase-media";
import { apiFetch } from "@/lib/api-client";

const DISMISSED_KEY = "aivio:seedance-2-5-announcement";
// Skip the auth flow pages entirely — popping a promo over a login form is
// just noise, and pathname changes there shouldn't re-trigger the check.
// "/admin" covers the whole staff console: a product launch ad is for
// customers, and popping one over an operator mid-action is both noise and a
// credibility problem — the console should never look like the marketing site.
const SUPPRESSED_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/admin",
];

const HERO = SHOWCASE_VIDEOS.find((v) => v.id === "falcon-desert")!;

/**
 * One-time-per-session "new model" spotlight. Shown app-wide (mounted in the
 * root layout) so it reaches both signed-out visitors on the marketing site
 * and signed-in users in the app shell — the CTA destination is the only
 * thing that branches on auth state.
 */
export function ReleaseAnnouncementModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);

  const suppressed = SUPPRESSED_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (suppressed) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    let cancelled = false;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    apiFetch("/api/auth/me")
      .then((res) => {
        if (!cancelled) setConnected(res.ok);
      })
      .catch(() => {})
      .finally(() => {
        // Opening this immediately would start the hero clip's fetch right
        // on top of the landing page's own hero video and any above-the-fold
        // showcase clips — exactly when bandwidth is most contended. A short
        // delay lets the page's own critical media win that race first.
        if (!cancelled) openTimer = setTimeout(() => setOpen(true), 1500);
      });

    return () => {
      cancelled = true;
      if (openTimer) clearTimeout(openTimer);
    };
    // Intentionally runs once on mount — this is a one-shot launch prompt,
    // not something that should re-evaluate on every route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setOpen(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  }

  function handleTryNow() {
    dismiss();
    router.push(connected ? "/generate" : "/login?next=/generate");
  }

  if (suppressed) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm data-[state=open]:animate-fade-up" />
        {/* max-w-sm + rounded-xl matches ui/modal.tsx's shell rather than the
            oversized bespoke card this used to be: an announcement should read
            as a card, not take over the screen. */}
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-xl border border-line bg-surface-2 shadow-modal focus:outline-none",
          )}
        >
          <Dialog.Title className="sr-only">Seedance 2.5 is now live</Dialog.Title>
          <Dialog.Description className="sr-only">
            Announcement: Seedance 2.5 has been added to the model catalog.
          </Dialog.Description>

          <div className="relative aspect-video w-full bg-surface-3">
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src={HERO.url} type="video/mp4" />
            </video>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-2 via-surface-2/10 to-transparent" />

            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="absolute top-2 right-2 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              >
                <X className="size-4" />
              </Button>
            </Dialog.Close>

            <div className="absolute inset-x-0 bottom-0 p-4">
              <Badge variant="brand">
                <Sparkles className="size-3.5" aria-hidden="true" />
                New release
              </Badge>
              <h2 className="mt-2 text-feature-title font-bold text-ink">Seedance 2.5 is now live</h2>
            </div>
          </div>

          <p className="px-4 pt-4 text-body-sm text-muted">
            Cinematic video from text, images, and references — with native audio, reference
            control, and up to 30s runtime.
          </p>

          <div className="flex items-center justify-end gap-2 p-4">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                Maybe later
              </Button>
            </Dialog.Close>
            <Button variant="accent" size="sm" onClick={handleTryNow}>
              Try 2.5 now
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
