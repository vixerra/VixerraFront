import type { Metadata } from "next";
import {
  featuredModelLabels,
  GeneratorLanding,
  generatorModels,
  listPhrase,
  type GeneratorLandingContent,
} from "@/components/marketing/generator-landing";
import { TIER_INFO } from "@/lib/constants";
import { GPT_IMAGE_2_IMAGES } from "@/lib/gpt-image-2-showcase";
import { appHref } from "@/lib/hosts";
import { howToStartSentence } from "@/lib/pricing";
import { metaDescription, openGraph, SITE_NAME } from "@/lib/seo";

// Targets "ai image generator". There is no free plan since 2026-10-15, so
// nothing here may claim the generator is free.

const { starter } = TIER_INFO;
const models = generatorModels("image");
const featured = featuredModelLabels(models, 3);
const vectorModel = models.find((m) => m.page.slug === "recraft-v4-1-vector");
// The image line on the Starter card ("~333 images") — reused rather than
// restated, so the two can't disagree when the grant changes.
const starterImages = starter.features.find((f) => / images?$/.test(f))?.replace("~", "about ");

const TITLE = "AI Image Generator — Text to Image";
const DESCRIPTION = metaDescription(
  `AI image generator: turn text into images with ${featured.join(", ")} and more. Every model on one credit balance.`,
);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ai-image-generator" },
  openGraph: openGraph({
    images: "file", title: TITLE, description: DESCRIPTION, path: "/ai-image-generator" }),
};

const content: GeneratorLandingContent = {
  kind: "image",
  heading: "AI Image Generator",
  tagline: `Create images from a text prompt with ${models.length} AI image models in one place.`,
  intro: `${SITE_NAME} is an AI image generator that runs ${models.length} image models — including ${listPhrase(
    featured,
  )} — from a single account. Write what you want to see and get finished images back, from quick drafts to high-resolution finals${
    vectorModel ? " and SVG vector graphics" : ""
  }.`,
  steps: [
    {
      title: "Pick an image model",
      detail:
        "Fast models for quick drafts, quality models for finals. The cost in credits is shown before you generate.",
    },
    {
      title: "Write your prompt",
      detail:
        "Describe the subject, style, lighting and composition. The more specific the prompt, the closer the first result.",
    },
    {
      title: "Generate and download",
      detail: "Images land in your gallery, ready to download or share.",
    },
  ],
  showcase: {
    label: "GPT Image 2",
    kind: "image",
    items: GPT_IMAGE_2_IMAGES.slice(0, 3).map((i) => ({ url: i.url, prompt: i.prompt })),
  },
  primaryCta: { label: "Open the AI image generator", href: appHref("/generate/image") },
  faqs: [
    {
      question: "How much does the AI image generator cost?",
      answer: `${howToStartSentence()}${
        starterImages ? ` On ${starter.label} that is ${starterImages} with the fast image models.` : ""
      } Paid plans export with no watermark and a commercial licence. The gallery is open without an account if you want to see results first.`,
    },
    {
      question: "What is an AI image generator?",
      answer: `An AI image generator creates a picture from a text description. On ${SITE_NAME} you choose one of ${models.length} image models, describe the image, and the model renders it — no photoshoot, stock library or design software needed.`,
    },
    {
      question: "Which AI image models can I use?",
      answer: `All of them from one account and one credit balance: ${listPhrase(models.map((m) => m.entry.label))}.`,
    },
    ...(vectorModel
      ? [
          {
            question: "Can it make logos and vector graphics?",
            answer: `Yes. ${vectorModel.entry.label} outputs SVG, so logos, icons and illustrations stay sharp at any size.`,
          },
        ]
      : []),
    {
      question: "Can I use the images commercially?",
      answer: `Yes. Every plan, from ${starter.label} up, includes a commercial licence.`,
    },
    {
      question: "Can I turn my images into video?",
      answer: `Yes — upload one to the ${SITE_NAME} AI video generator and describe how it should move.${
        " Every plan includes video."
      }`,
    },
  ],
  sibling: {
    href: "/ai-video-generator",
    label: "Make it move with the AI video generator",
    blurb: "Turn a prompt or one of your images into a video clip.",
  },
};

export default function AiImageGeneratorPage() {
  return <GeneratorLanding content={content} />;
}
