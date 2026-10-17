"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The marquee's second, looping copy — rendered only after hydration, so the
 * server HTML (what crawlers and no-JS visitors read) lists every item once.
 * Before mount the track simply isn't doubled yet; the animation starts once
 * it is.
 */
export function MarqueeEcho({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // Mount detection: the one legitimate setState-in-effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : null;
}
