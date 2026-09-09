"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating "back to top" button, bottom-right — the migration brief's one
 * persistent floating element with a real destination (unlike its Discord
 * button, which this app has no real community link for, so it's skipped).
 * Appears once the visitor has scrolled roughly past the hero.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="btn-glass fixed right-5 bottom-5 z-40 flex size-11 items-center justify-center rounded-full text-white shadow-floating transition-transform hover:scale-105 active:scale-95"
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
