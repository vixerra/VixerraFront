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

import { TIER_INFO } from "@/lib/constants";

export type Faq = { question: string; answer: string };

export const HOME_FAQS: Faq[] = [
  {
    question: "What models does Vixerra support?",
    answer:
      "Several video models — Seedance 2.5 and 2.0, Google's Veo 3.1, and more from ByteDance, Black Forest Labs, and xAI — and several image models, including Recraft, Stable Diffusion, and Google's Nano Banana — the model behind the example images throughout this page.",
  },
  {
    question: "What's the pricing?",
    answer: `${TIER_INFO.free.label} starts at $0 with ${TIER_INFO.free.monthlyCredits} one-time credits that never expire. ${TIER_INFO.starter.label} is $${TIER_INFO.starter.priceMonthly}/month, ${TIER_INFO.creator.label} is $${TIER_INFO.creator.priceMonthly}/month, and ${TIER_INFO.studio.label} is $${TIER_INFO.studio.priceMonthly}/month. ${TIER_INFO.creator.label} and above also unlock the marketing studio, the editing studio, and publishing straight to TikTok, Instagram, YouTube, and Facebook — see the full comparison on the Pricing page.`,
  },
  {
    question: "Is there an API?",
    answer:
      "Yes. Generate an API key from Settings → API Keys once you're signed in, and call the same generation pipeline the web app uses.",
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
    question: "Do I need a credit card to start?",
    answer: `No — sign up and start creating free with ${TIER_INFO.free.monthlyCredits} credits, no credit card required.`,
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
