"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { PLANS_FROM_LABEL } from "@/lib/pricing";

// Same ask as the hero: the plans; the gallery is the fallback for whoever
// is still looking. Closes the page on the same slanted yellow
// tags the hero opens with.
export function CtaSection() {
  return (
    <section className="relative isolate overflow-hidden border-t border-line py-24 sm:py-32">
      <div className="grid-texture pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <Reveal className="container-page flex flex-col items-center gap-7 text-center">
        <h2 className="font-narrow flex flex-col items-center gap-1.5 text-[2.2rem] leading-none font-semibold tracking-[-0.01em] uppercase min-[400px]:text-5xl sm:gap-2 sm:text-6xl lg:text-7xl">
          <span className="tag-slant">Every top model</span>
          <span className="tag-slant">One studio</span>
        </h2>
        <p className="max-w-lg text-body-lg text-muted">
          Video, images, Genjutsu and AI Influencers, all in one place. {PLANS_FROM_LABEL},
          cancel anytime.
        </p>
        <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <a href="#plans" className={buttonVariants({ variant: "accent", size: "lg" })}>
            Choose my plan
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
          <Link href="/gallery" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Browse the gallery
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
