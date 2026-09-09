"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUpVariants } from "@/lib/animations";

/**
 * Fades + slides + blurs an element in the first time it scrolls into view,
 * per the design system's fadeUpVariants (§5.3 Fade Up on Scroll).
 * prefers-reduced-motion users get the fully-visible end state immediately —
 * Framer Motion animations run outside CSS transitions/keyframes, so this
 * has to be handled explicitly via useReducedMotion() rather than relying
 * on the blanket CSS override in globals.css.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const variants = {
    hidden: fadeUpVariants.hidden,
    visible: {
      ...fadeUpVariants.visible,
      transition: { ...fadeUpVariants.visible.transition, delay: delayMs / 1000 },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
    >
      {children}
    </motion.div>
  );
}
