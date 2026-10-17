// The FAQ copy, lifted out of faq-accordion.tsx so the server can emit
// FAQPage structured data from exactly the same array the accordion renders.
//
// Google treats FAQ markup that doesn't match visible page content as a
// violation, so these must stay the same object rather than two lists that
// happen to agree today.
//
// Answers are grounded in facts stated elsewhere in this app (TIER_INFO, the
// real /settings/api-keys page, the CtaSection/StatsStrip copy) rather than
// invented claims.

import { IMAGE_MODELS, TIER_INFO, VIDEO_MODELS } from "@/lib/constants";
import { freePlanAnswer, pricingSummary } from "@/lib/pricing";

/** "A, B, and C" */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Read off the same registry the composer and the model strip use, so the
// answer can't name a model that isn't offered (it once listed Stable
// Diffusion) or miss one that is.
const MODELS_ANSWER =
  `${VIDEO_MODELS.length} video models — ${list(VIDEO_MODELS.map((m) => m.label))} — ` +
  `and ${IMAGE_MODELS.length} image models — ${list(IMAGE_MODELS.map((m) => m.label))}. ` +
  "Every one runs from the same credit balance; the Models page has specs and example prompts for each.";

export type Faq = { question: string; answer: string };

export const HOME_FAQS: Faq[] = [
  {
    question: "What models does Vixlens support?",
    answer: MODELS_ANSWER,
  },
  {
    question: "What's the pricing?",
    answer: `${pricingSummary()} ${TIER_INFO.creator.label} and above also unlock the marketing studio, the editing studio, and publishing straight to TikTok, Instagram, YouTube, and Facebook — see the full comparison on the Pricing page.`,
  },
  {
    question: "Is there an API?",
    answer: `Yes, on the ${TIER_INFO.studio.label} plan. Generate an API key from Settings → API Keys once you're signed in, and call the same generation pipeline the web app uses — see the developer page for an example request.`,
  },
  {
    question: "What file formats are supported?",
    answer: "Video exports as MP4 (MOV on select models); images export as standard PNG/JPEG files.",
  },
  {
    question: "How fast is generation?",
    answer:
      "Typical turnaround is under 60 seconds for a finished clip, with live progress streamed to the page.",
  },
  {
    question: "Is there a free plan?",
    answer: freePlanAnswer(),
  },
];

/** Schema.org FAQPage for a list of question/answer pairs. */
export function faqPageJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
