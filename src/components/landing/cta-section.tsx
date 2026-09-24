"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";
import { GradientGlow } from "@/components/marketing/gradient-glow";
import { TIER_INFO } from "@/lib/constants";
import { ENTRY_PRICE_MONTHLY, formatListPrice } from "@/lib/competitor-pricing";
import { appHref } from "@/lib/hosts";

// Subscribe-first like the hero: the plans are the ask, the free grant is
// the fallback underneath it.
export function CtaSection() {
  return (
    <section className="container-page relative py-20 sm:py-28">
      <GradientGlow className="opacity-60" />
      <Reveal className="relative">
        <Card
          variant="feature"
          className="flex flex-col items-center gap-6 border-brand/30 text-center shadow-glow-md"
        >
          <h2 className="text-heading font-bold text-ink sm:text-5xl">
            Every top model. <span className="text-gradient">One subscription.</span>
          </h2>
          <p className="max-w-lg text-body text-muted">
            Plans from {formatListPrice(ENTRY_PRICE_MONTHLY)} a month, cancel anytime.
          </p>
          <a href="#plans" className={buttonVariants({ variant: "accent", className: "px-8" })}>
            Choose my plan
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
          <p className="text-caption text-muted">
            Or{" "}
            <Link
              href={appHref("/signup")}
              prefetch={false}
              className="text-ink underline decoration-white/20 underline-offset-4 hover:text-brand"
            >
              start free with {TIER_INFO.free.monthlyCredits} credits
            </Link>
            , no card required.
          </p>
        </Card>
      </Reveal>
    </section>
  );
}
