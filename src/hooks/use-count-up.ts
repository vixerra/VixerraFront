"use client";

import { useEffect, useRef, useState } from "react";

/** Animates 0 -> target once `active` first becomes true. Collapses to a
 * single-frame jump for prefers-reduced-motion instead of animating. */
export function useCountUp(target: number, active: boolean, durationMs = 1200) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reduceMotion ? 0 : durationMs;
    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = effectiveDuration === 0 ? 1 : Math.min(1, (now - start) / effectiveDuration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, durationMs]);

  return value;
}
