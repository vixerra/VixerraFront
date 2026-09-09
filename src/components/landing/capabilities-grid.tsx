"use client";

import { Rocket, Palette, Fingerprint, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { gridContainerVariants, gridItemVariants } from "@/lib/animations";
import { TiltCard } from "@/components/marketing/tilt-card";
import { cn } from "@/lib/utils";

// Same four-fill rotation as features-grid.tsx (lime/hot/amber/orange)
// instead of every icon badge sharing one gradient fill.
const CHIP_COLORS = ["bg-brand", "bg-accent-hot", "bg-accent-amber", "bg-accent-orange"];

// "Why creatives choose Vixerra" — plain icon + copy cards. No per-card
// video/image sample here: the page's real output examples are kept to the
// one dedicated "See it in action" showcase section instead of being spread
// across every section.
const REASONS = [
  {
    icon: Rocket,
    title: "From idea to execution",
    body: "A single prompt becomes a fully realized, photoreal shot — natural lighting, fine detail, real motion.",
  },
  {
    icon: Palette,
    title: "Diverse styles",
    body: "Photoreal one moment, illustrated poster art the next — the same model adapts to the brief.",
  },
  {
    icon: Fingerprint,
    title: "Consistency & control",
    body: "The same character keeps its identity across multiple generated scenes.",
  },
  {
    icon: ShieldCheck,
    title: "Built for real work",
    body: "Sharp text, clean detail, and edits that hold up in production — not just nice-looking demos.",
  },
] as const;

export function CapabilitiesGrid() {
  return (
    <section id="capabilities" className="container-page py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-heading font-bold text-ink">Why creatives choose Vixerra</h2>
        <p className="mt-4 text-body text-muted">
          Most AI tools promise fast results. Vixerra is built for the work that comes after —
          shots you can actually ship.
        </p>
      </motion.div>

      <motion.div
        variants={gridContainerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {REASONS.map((reason, index) => (
          <motion.div key={reason.title} variants={gridItemVariants}>
            <TiltCard className="h-full">
              <div className="flex h-full flex-col gap-6 rounded-2xl border border-line bg-surface-2 p-6 shadow-card transition-colors duration-300 hover:border-brand/40">
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-xl shadow-glow-sm",
                    CHIP_COLORS[index % CHIP_COLORS.length],
                  )}
                >
                  <reason.icon className="size-6 text-on-brand" aria-hidden="true" />
                </span>

                <div>
                  <h3 className="text-feature-title font-semibold text-ink">{reason.title}</h3>
                  <p className="mt-2 text-body-sm text-muted">{reason.body}</p>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
