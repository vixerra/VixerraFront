// Shared Framer Motion primitives — transcribed from the design system's
// §5.1 configuration so every animated component uses the same easing/
// duration vocabulary instead of inventing its own cubic-beziers.

export const easing = {
  smooth: [0.25, 0.1, 0.25, 1], // Standard smooth
  snappy: [0.4, 0, 0.2, 1], // Quick response
  bouncy: [0.68, -0.55, 0.265, 1.55], // Playful
  elegant: [0.16, 1, 0.3, 1], // Premium feel
  dramatic: [0.87, 0, 0.13, 1], // Impact
} as const;

export const durations = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  dramatic: 0.8,
  cinematic: 1.2,
} as const;

// Fade-up-with-blur used by <Reveal> and any section entering on scroll.
export const fadeUpVariants = {
  hidden: {
    opacity: 0,
    y: 60,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: durations.slow,
      ease: easing.elegant,
    },
  },
} as const;

// Per-word hero title reveal.
export const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
} as const;

export const heroWordVariants = {
  hidden: {
    opacity: 0,
    y: 40,
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: durations.slow,
      ease: easing.elegant,
    },
  },
} as const;

// Slide-up entrance for the hero prompt input / CTA row.
export const slideUpVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: easing.elegant,
    },
  },
} as const;

// Staggered grid container + item, for card grids and masonry galleries.
export const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
} as const;

export const gridItemVariants = {
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: easing.elegant,
    },
  },
} as const;
