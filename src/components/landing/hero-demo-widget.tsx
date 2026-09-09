"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { ImagePlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODEL_PILLS = ["Seedance 2.5", "Seedance 2.0", "Recraft"];
// A real, in-range default for Seedance 2.5 (see SEEDANCE_RESOLUTIONS /
// SEEDANCE_DURATION_MAX / SEEDANCE_ASPECT_RATIOS in constants.ts) — shown as
// informational chrome only, not a claim that these are the only options.
const SPECS_PILL = "720p · 30s · 16:9";

// Rotates the empty-state placeholder through a few real prompt ideas
// (pulled from the same curated set shown in the Showcase section below)
// instead of sitting on one static line — stops as soon as the visitor
// types anything, since the native placeholder is hidden once there's a
// value. Static on prefers-reduced-motion.
const PLACEHOLDER_PROMPTS = [
  "A lone astronaut walking across a rust-colored Martian plain at dusk…",
  "A flamenco dancer alone in a dark practice room, dust lifting off the boards…",
  "A vaporwave poster with a Roman bust statue and a pink-and-cyan grid…",
  "A night rally car drifting through a gravel corner in the pines…",
];

/**
 * Decorative-but-convincing "try it now" widget, echoing vivideo.ai's
 * embedded hero demo. Nothing here calls the real generation API — any
 * interaction routes to /signup, and the disclaimer says so, matching the
 * honesty pattern already used on the billing/contact pages.
 */
export function HeroDemoWidget() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODEL_PILLS[0]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_PROMPTS.length);
    }, 3600);
    return () => clearInterval(id);
  }, [shouldReduceMotion]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    router.push("/signup");
  }

  function cycleModel() {
    const i = MODEL_PILLS.indexOf(model);
    setModel(MODEL_PILLS[(i + 1) % MODEL_PILLS.length]);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass mx-auto mt-10 max-w-2xl rounded-2xl p-2 shadow-floating sm:p-3"
    >
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
        className="w-full bg-transparent px-3 py-2 text-body-sm text-ink-soft placeholder:text-muted focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line px-1 pt-3">
        <button
          type="button"
          aria-label="Attach a reference image"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-muted hover:text-ink-soft"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={cycleModel}
          className="rounded-full border border-line bg-white/5 px-3 py-1.5 font-mono text-caption text-ink-soft transition-colors hover:border-muted"
        >
          {model} <span className="text-muted">▾</span>
        </button>

        <span className="hidden rounded-full border border-line px-3 py-1.5 font-mono text-caption text-muted sm:inline-block">
          {SPECS_PILL}
        </span>

        <Button type="submit" variant="accent" className="ml-auto shrink-0">
          Generate AI Video <Sparkles className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-2 px-3 text-caption text-muted">
        Interactive preview — sign up to generate for real.
      </p>
    </form>
  );
}
