"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

/**
 * Thin silver reading-progress bar pinned to the top of the viewport, per the
 * design system's §5.5 "Progress Bar" spec — spring-smoothed scroll
 * fraction instead of the previous raw rAF/scroll-listener version.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      className="fixed top-0 right-0 left-0 z-[100] h-0.5 origin-left bg-brand"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}
