"use client";

import { Reveal } from "@/components/marketing/reveal";

// Linear four-step flow, laid out like comfy.org's "Get started in minutes":
// a big light title on the left, numbered rows with oversized light numerals
// and hairline dividers on the right. Stacks on mobile.
const STEPS = [
  {
    title: "Prompt or upload",
    body: "Type a text prompt, or start from an image or audio clip.",
  },
  {
    title: "Pick a model",
    body: "Choose from Seedance 2.5, Kling 3.0, GPT Image 2, Nano Banana Pro, and more.",
  },
  {
    title: "Refine & adjust",
    body: "Use plain-language editing and reference control to polish the result.",
  },
  {
    title: "Export with ease",
    body: "Download in HD, drop it into a collection, or share a public link.",
  },
];

export function HowItWorks() {
  return (
    <section className="container-page py-20 sm:py-28">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-4 text-heading text-ink">Get started in minutes</h2>
          <p className="mt-4 max-w-sm text-body text-muted">
            Prompt, refine, and export — ready to share.
          </p>
        </Reveal>

        <ol className="border-t border-line">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-b border-line">
              <Reveal
                delayMs={index * 100}
                className="grid grid-cols-[3.5rem_1fr] items-start gap-x-4 gap-y-2 py-7 sm:grid-cols-[5rem_1fr_1fr] sm:gap-x-8 sm:py-9"
              >
                <span
                  className="row-span-2 text-5xl leading-none font-light tracking-tight text-muted tabular-nums sm:row-span-1 sm:text-6xl"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <h3 className="text-feature-title text-ink sm:text-2xl">{step.title}</h3>
                <p className="text-body-sm text-muted sm:pt-1.5">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
