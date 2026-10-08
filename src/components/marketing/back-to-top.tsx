"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { DISCORD_INVITE, DiscordIcon } from "@/components/layout/discord";

const FLOATING =
  "btn-glass relative flex size-11 items-center justify-center rounded-full text-ink shadow-floating transition-transform hover:scale-105 active:scale-95";

/**
 * Floating buttons, bottom-right: the Discord invite, always there, and
 * "back to top" under it once the visitor has scrolled roughly past the hero.
 * One column anchored to the corner, so Discord steps up to make room for
 * the arrow instead of the two overlapping.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed right-5 bottom-5 z-40 flex flex-col items-center gap-3">
      <a
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join our Discord community"
        title="Join our Discord community"
        className={FLOATING}
      >
        <DiscordIcon className="size-5" />
      </a>
      {visible && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className={FLOATING}
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
