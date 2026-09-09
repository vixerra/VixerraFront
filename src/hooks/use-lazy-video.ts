"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Backs every "don't load this video until it's about to be on screen" spot
 * on the landing page (showcase tiles, feature/capability media, ...).
 * Nothing is fetched until the container gets within 80px of the viewport
 * (IntersectionObserver rootMargin) — the <video> itself should only be
 * mounted once that's happened (see `hasLoadedOnce`), not rendered
 * unconditionally with a `hidden`-style class, since the browser starts
 * fetching a <video>'s <source> the moment it's in the DOM regardless of
 * CSS visibility. Playback pauses whenever it scrolls back out of view, but
 * the element stays mounted once loaded — no re-fetch from scrolling past
 * it a second time.
 *
 * Margin is kept tight (rather than e.g. 200px) so a dense grid of many
 * tiles (showcase-tabs' masonry, features-showcase's groups) doesn't cross
 * the threshold all at once and fire a burst of simultaneous video fetches
 * the moment that section nears the viewport — the whole point of lazy
 * loading is defeated if "lazy" still means "a dozen at a time".
 *
 * Single shared implementation for every video tile on the page (showcase
 * grid, model carousel, capability/feature cards, how-it-works result,
 * stats strip, CTA section) so this tuning only needs to happen in one place.
 *
 * `playOnHover` narrows that further for grids where every tile is a video
 * and playing them all at once is noise rather than life — the presets
 * gallery, where a dozen unrelated clips moving in parallel makes the page
 * unreadable. In that mode the clip holds its first frame until the pointer
 * (or keyboard focus) is on the tile, and rewinds on the way out so the next
 * hover starts the shot from the top rather than resuming mid-motion.
 *
 * Hover is a capability, not an assumption: a touch device has no hover
 * state, so `(hover: hover)` decides, and where it doesn't hold the tile
 * falls back to the in-view autoplay above rather than showing a clip that
 * can never be played. Checked with matchMedia rather than CSS because the
 * decision drives `play()`/`pause()`, not styling — and re-checked on
 * change, since a tablet with a keyboard attached flips this at runtime.
 */
export function useLazyVideo<Container extends HTMLElement = HTMLDivElement>({
  playOnHover = false,
}: { playOnHover?: boolean } = {}) {
  const containerRef = useRef<Container>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [active, setActive] = useState(false);
  // Starts false so the server-rendered pass and the first client pass agree;
  // an effect is the only place `window` may be read.
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (!playOnHover) return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setCanHover(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [playOnHover]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setHasLoadedOnce(true);
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hoverGated = playOnHover && canHover;
  const shouldPlay = hoverGated ? inView && active : inView;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (shouldPlay) {
      void videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
      // Only in hover mode: scrolling a landing-page tile out and back should
      // resume, but a second hover should replay the shot from its first frame.
      if (hoverGated) videoEl.currentTime = 0;
    }
  }, [shouldPlay, hasLoadedOnce, hoverGated]);

  const start = useCallback(() => setActive(true), []);
  const stop = useCallback(() => setActive(false), []);

  /**
   * Spread on whatever element the user actually points at — usually the
   * card, not the video, since overlaid text and badges would otherwise
   * count as leaving the clip. Focus/blur are included so the same tile
   * plays when tabbed to, which is the keyboard equivalent of hovering.
   */
  const hoverProps = {
    onPointerEnter: start,
    onPointerLeave: stop,
    onFocus: start,
    onBlur: stop,
  };

  return { containerRef, videoRef, hasLoadedOnce, hoverProps, isPlaying: shouldPlay };
}
