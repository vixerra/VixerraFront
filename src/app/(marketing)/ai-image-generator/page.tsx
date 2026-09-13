import type { Metadata } from "next";
import {
  featuredModelLabels,
  freeVideoOffer,
  GeneratorLanding,
  generatorModels,
  listPhrase,
  type GeneratorLandingContent,
} from "@/components/marketing/generator-landing";
import { TIER_INFO } from "@/lib/constants";
import { GPT_IMAGE_2_IMAGES } from "@/lib/gpt-image-2-showcase";
import { appHref } from "@/lib/hosts";
import { metaDescription, openGraph, SITE_NAME } from "@/lib/seo";

// Targets "ai image generator" / "ai image generator free". Unlike video, the
// free claim holds here: the Free grant is sized for the fast image models.

const { free, starter } = TIER_INFO;
const models = generatorModels("image");
const freeVideo = freeVideoOffer();
const featured = featuredModelLabels(models, 3);
const vectorModel = models.find((m) => m.page.slug === "recraft-v4-1-vector");
// "~10 images" on the Free card — reused rather than restated, so the two
// can't disagree when the grant changes.
const freeImages = free.features.find((f) => f.endsWith(" images"))?.replace("~", "about ");

const TITLE = "Free AI Image Generator — Text to Image";
const DESCRIPTION = metaDescription(
  `Free AI image generator: turn text into images with ${featured.join(", ")} and more. ${free.monthlyCredits} free credits, no credit card.`,
);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ai-image-generator" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/ai-image-generator" }),
};

const content: GeneratorLandingContent = {
  kind: "image",
  heading: "AI Image Generator",
  tagline: `Create images from a text prompt with ${models.length} AI image models in one place — free to start.`,
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
      question: "Is the AI image generator free?",
      answer: `Yes. A free account comes with ${free.monthlyCredits} credits and no credit card${
        freeImages ? ` — enough for ${freeImages} with the fast image models` : ""
      }, and those credits never expire. When you need more, ${starter.label} is $${starter.priceMonthly}/month for ${starter.monthlyCredits.toLocaleString("en-US")} credits.`,
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
      answer: `Commercial use is included from the ${starter.label} plan up. The ${free.label} plan is for trying the models and does not include a commercial licence.`,
    },
    {
      question: "Can I turn my images into video?",
      answer: `Yes — upload one to the ${SITE_NAME} AI video generator and describe how it should move.${
        freeVideo
          ? ` Your free credits cover ${freeVideo.clips} short clips with ${freeVideo.label}.`
          : ` Video starts on the ${starter.label} plan.`
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
