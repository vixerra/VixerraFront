"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INFLUENCER_FILM,
  OPEN_ANNOUNCEMENT_EVENT,
  influencerHref,
} from "@/lib/feature-announcement";
import { useMe } from "@/hooks/use-me";

const DISMISSED_KEY = "vixlens:ai-influencer-announcement";
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

const STEPS = [
  { title: "Design them", body: "Face, body and style, locked." },
  { title: "Make them move", body: "Dance, pose, perform." },
  { title: "Post everywhere", body: "Reels, Shorts, UGC, ads." },
] as const;

/**
 * One-time-per-session "new feature" spotlight. Shown app-wide (mounted in
 * the root layout) so it reaches both signed-out visitors on the marketing
 * site and signed-in users in the app shell — the CTA destination is the
 * only thing that branches on auth state. The landing banner also opens it
 * on demand (openFeatureAnnouncement), whatever the session flag says.
 */
export function ReleaseAnnouncementModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // The header's query, so this adds no /auth/me call of its own.
  const { data: user } = useMe();

  const suppressed = SUPPRESSED_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (suppressed) return;

    const openNow = () => setOpen(true);
    window.addEventListener(OPEN_ANNOUNCEMENT_EVENT, openNow);

    // Waits for the visitor's first scroll, tap or key, then a short delay.
    // Opening on a timer alone started the film's fetch during every page
    // load — on top of the page's own critical media. Already on the
    // feature's own page, the ad has nothing left to sell.
    const events = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      events.forEach((e) => window.removeEventListener(e, arm));
      // Re-checked at fire time: the banner may have opened (and closed) it
      // during the delay.
      openTimer = setTimeout(() => {
        if (!sessionStorage.getItem(DISMISSED_KEY)) setOpen(true);
      }, 1500);
    };
    const autoOpen =
      !sessionStorage.getItem(DISMISSED_KEY) && !pathname?.startsWith("/influencer");
    if (autoOpen) events.forEach((e) => window.addEventListener(e, arm, { passive: true }));

    return () => {
      window.removeEventListener(OPEN_ANNOUNCEMENT_EVENT, openNow);
      events.forEach((e) => window.removeEventListener(e, arm));
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

  if (suppressed) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm data-[state=open]:animate-fade-up" />
        {/* Wider than ui/modal.tsx's shell on purpose: the film carries its
            own on-screen type, which is unreadable at max-w-sm. */}
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2",
            "overflow-y-auto rounded-2xl border border-line bg-surface-2 shadow-modal focus:outline-none data-[state=open]:animate-fade-up",
          )}
        >
          <FilmPlayer />

          <div className="p-5 sm:p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] leading-none tracking-[0.2em] text-muted uppercase">
              <span className="size-1.5 rounded-full bg-brand shadow-glow-sm" aria-hidden="true" />
              New · <span className="text-brand">For free</span>
            </span>

            <Dialog.Title className="font-display mt-4 text-[28px] leading-[1.05] font-bold tracking-tight text-ink sm:text-[34px]">
              Your next influencer{" "}
              <span className="text-accent-script text-[1.12em] tracking-normal text-brand">
                isn’t human.
              </span>
            </Dialog.Title>
            <Dialog.Description className="mt-3 max-w-lg text-body-sm text-muted">
              Design an AI influencer once. Face, body and style stay locked in every video you
              create. <span className="font-semibold text-brand">For free.</span>
            </Dialog.Description>

            {/* Dropped on short screens (laptops, phones), where it would push
                the CTA row below the fold — the film already walks the
                same three steps. */}
            <ol className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 short:hidden">
              {STEPS.map((step, i) => (
                <li key={step.title} className="bg-surface-2 px-4 py-3">
                  <p className="font-mono text-[11px] tracking-[0.2em] text-brand uppercase">
                    Step 0{i + 1}
                  </p>
                  <p className="mt-1 text-label font-semibold text-ink">{step.title}</p>
                  <p className="text-caption text-text-tertiary">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm">
                  Maybe later
                </Button>
              </Dialog.Close>
              <Link
                href={influencerHref(Boolean(user))}
                prefetch={false}
                onClick={dismiss}
                className="group/cta font-display inline-flex items-center justify-center gap-2 rounded-full bg-brand py-2 pr-2 pl-5 text-label font-semibold text-on-brand shadow-glow-md transition-[background-color,box-shadow] hover:bg-brand-hover hover:shadow-glow-lg"
              >
                Create yours for free
                <span className="flex size-7 items-center justify-center rounded-full bg-on-brand text-brand transition-transform group-hover/cta:translate-x-0.5">
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The launch film. Only exists while the dialog is open (Radix unmounts
 * closed content), so the bytes are spent only on people who see it. A pause
 * control is required for motion over 5s (WCAG 2.2.2), and reduced-motion
 * visitors get the poster until they press play.
 */
function FilmPlayer() {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  // Progress hairline written straight to the DOM per frame — through state
  // it would re-render the dialog 60 times a second.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && barRef.current && video.duration) {
        barRef.current.style.transform = `scaleX(${video.currentTime / video.duration})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-surface-3">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={INFLUENCER_FILM.poster}
        autoPlay={!reduceMotion}
        muted
        loop
        playsInline
        preload={reduceMotion ? "none" : "auto"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={INFLUENCER_FILM.webm} type="video/webm" />
        <source src={INFLUENCER_FILM.mp4} type="video/mp4" />
        {/* Silent launch film with no dialogue; the track says so. */}
        <track kind="captions" src="/media/captions/no-dialogue.vtt" srcLang="en" label="English" />
      </video>

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

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause film" : "Play film"}
        className="absolute bottom-3 left-3 flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
      >
        {playing ? (
          <Pause className="size-4 fill-current" aria-hidden="true" />
        ) : (
          <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
        )}
      </button>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10" aria-hidden="true">
        <div ref={barRef} className="h-full origin-left bg-brand" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}
