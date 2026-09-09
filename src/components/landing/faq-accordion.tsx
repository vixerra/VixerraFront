"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";
import { HOME_FAQS } from "@/lib/faqs";

// FAQ copy lives in lib/faqs.ts so the homepage can emit the matching
// FAQPage structured data from the same array this renders.

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="container-page py-20 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-heading font-bold text-ink">Frequently asked questions</h2>
      </Reveal>

      <div className="mx-auto mt-12 max-w-2xl space-y-3">
        {HOME_FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={faq.question} className="rounded-lg border border-line transition-colors hover:bg-surface-2">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-left"
              >
                <span className="text-feature-title font-semibold text-ink">{faq.question}</span>
                <Plus
                  className={cn(
                    "size-5 shrink-0 text-muted transition-transform duration-200",
                    isOpen && "rotate-45",
                  )}
                  aria-hidden="true"
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-body-sm text-muted">{faq.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
