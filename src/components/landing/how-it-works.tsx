"use client";

import { motion } from "framer-motion";
import { Type, Sparkles, Wand2, Download } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

// leonardo.ai's real "How it works" section is a simple linear 4-step flow
// (Prompt/upload → Pick a style → Refine & adjust → Export with ease) —
// separate from their Create/Refine/Scale features section (see
// features-showcase.tsx). Steps adapted to what Vixerra actually does.
const STEPS = [
  {
    icon: Type,
    title: "Prompt or upload",
    body: "Type a text prompt, or start from an image or audio clip.",
  },
  {
    icon: Sparkles,
    title: "Pick a model",
    body: "Choose from Seedance, Recraft, Nano Banana, and more.",
  },
  {
    icon: Wand2,
    title: "Refine & adjust",
    body: "Use plain-language editing and reference control to polish the result.",
  },
  {
    icon: Download,
    title: "Export with ease",
    body: "Download in HD, drop it into a collection, or share a public link.",
  },
];

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);

  return (
    <section className="container-page py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-heading font-bold text-ink">How Vixerra works</h2>
        <p className="mt-4 text-body text-muted">
          Prompt, refine, and export — ready to share.
        </p>
      </Reveal>

      <div ref={ref} className="mt-16">
        {/* Icon row + connecting line that fills in once scrolled into view (desktop only) */}
        <div className="relative hidden sm:grid sm:grid-cols-4">
          <div
            className="pointer-events-none absolute top-6 right-[12.5%] left-[12.5%] h-px bg-line"
            aria-hidden="true"
          >
            <motion.div
              className="h-full origin-left bg-brand"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: inView ? 1 : 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          {STEPS.map((step) => (
            <div key={step.title} className="flex justify-center">
              <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-brand shadow-glow-sm">
                <step.icon className="size-5 text-on-brand" aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-10 sm:mt-6 sm:grid-cols-4 sm:gap-6">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delayMs={index * 150}>
              <div className="flex size-12 items-center justify-center rounded-full bg-brand shadow-glow-sm sm:hidden">
                <step.icon className="size-5 text-on-brand" aria-hidden="true" />
              </div>
              <span
                className={cn(
                  "mt-4 block font-mono text-caption text-brand sm:mt-0",
                )}
              >
                0{index + 1}
              </span>
              <h3 className="mt-2 text-feature-title font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-body-sm text-muted">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
