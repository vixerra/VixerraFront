"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pointer-driven 3D tilt + glow-follow on hover. Mutates CSS custom
 * properties directly on the DOM node (no React state / re-render per
 * mousemove) so it stays cheap even on a grid of many cards. Skips the
 * tilt transform entirely for prefers-reduced-motion.
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotionRef = useRef<boolean | null>(null);

  function prefersReducedMotion() {
    if (reduceMotionRef.current === null) {
      reduceMotionRef.current =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return reduceMotionRef.current;
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--tilt-x", `${(0.5 - py) * 8}deg`);
    el.style.setProperty("--tilt-y", `${(px - 0.5) * 8}deg`);
    el.style.setProperty("--glow-x", `${px * 100}%`);
    el.style.setProperty("--glow-y", `${py * 100}%`);
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group/tilt relative transition-transform duration-200 ease-out will-change-transform",
        "[transform:perspective(800px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
        style={{
          background:
            "radial-gradient(280px circle at var(--glow-x,50%) var(--glow-y,50%), rgb(187 220 18 / 0.14), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}
