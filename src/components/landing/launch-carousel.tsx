"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type LaunchSlide = { id: string; label: string; content: ReactNode };

const AUTOPLAY_MS = 8000;

/**
 * The landing page's feature launches, one card at a time. A native
 * scroll-snap track, so touch swipe and trackpad scroll work with no gesture
 * code; the tabs and arrows just scroll it. Auto-advances only while nobody
 * is pointing at or focused in it (WCAG 2.2.2), only while it's on screen,
 * never under reduced motion, and not while the tab is hidden.
 */
export function LaunchCarousel({ slides }: { slides: LaunchSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const count = track.children.length;
    const next = ((index % count) + count) % count;
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }, []);

  // The track's position is the source of truth, so a swipe updates the tabs.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setActive(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1))),
      );
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Only counts down while on screen, so nobody scrolls down to find the
  // first slide already gone.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.5,
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const autoplay = inView && !paused && !reduceMotion && slides.length > 1;

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") goTo(active + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [active, autoplay, goTo]);

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="New on Vixlens"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Choose a launch" className="flex gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls={`launch-slide-${slide.id}`}
              onClick={() => goTo(i)}
              className={cn(
                "relative overflow-hidden rounded-full border px-3.5 py-1.5 font-mono whitespace-nowrap sm:px-4 text-[11px] tracking-[0.18em] uppercase transition-colors",
                i === active
                  ? "border-brand-ink/60 bg-brand/10 text-brand-ink"
                  : "border-line text-muted hover:border-border-strong hover:text-ink",
              )}
            >
              {slide.label}
              {/* Time left on this slide, while it's auto-advancing. */}
              {i === active && autoplay && (
                <span
                  key={active}
                  className="absolute inset-x-0 bottom-0 h-px origin-left bg-brand-ink motion-safe:animate-[launch-progress_8s_linear_forwards]"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>

        {/* Phones swipe the track instead. */}
        <div className="hidden gap-2 sm:flex">
          <ArrowButton label="Previous launch" onClick={() => goTo(active - 1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </ArrowButton>
          <ArrowButton label="Next launch" onClick={() => goTo(active + 1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </ArrowButton>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            id={`launch-slide-${slide.id}`}
            role="tabpanel"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}: ${slide.label}`}
            // Off-screen slides stay out of the tab order.
            inert={i !== active}
            className="w-full shrink-0 snap-center snap-always"
          >
            {slide.content}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArrowButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand-ink/60 hover:text-ink"
    >
      {children}
    </button>
  );
}
