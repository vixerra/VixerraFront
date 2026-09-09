"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";
import { GradientGlow } from "@/components/marketing/gradient-glow";

export function CtaSection() {
  return (
    <section className="container-page relative py-20 sm:py-28">
      <GradientGlow className="opacity-60" />
      <Reveal className="relative">
        <Card
          variant="feature"
          className="flex flex-col items-center gap-6 border-brand/30 text-center shadow-glow-md"
        >
          <h2 className="text-heading font-bold text-ink">
            Ready to create your <span className="text-gradient">first video</span>?
          </h2>
          <p className="max-w-lg text-body text-muted">
            Start free with 50 credits — no credit card required.
          </p>
          <Link href="/signup" className={buttonVariants()}>
            Start creating free
          </Link>
        </Card>
      </Reveal>
    </section>
  );
}
