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
import { appHref } from "@/lib/hosts";
import { modelSpecs } from "@/lib/model-seo";
import { metaDescription, openGraph, SITE_NAME } from "@/lib/seo";
import { SEEDANCE25_SHOWCASE_VIDEOS } from "@/lib/showcase-media";

// Targets "ai video generator", "ai video" and "free ai video generator". The
// free claim rests on freeVideoOffer(): the Free grant covering a real clip on
// a watermark-exempt model. If that ever stops being true, the title, tagline
// and FAQ fall back to saying video starts on Starter instead.

const { free, starter, creator, studio } = TIER_INFO;
const models = generatorModels("video");
const freeVideo = freeVideoOffer();
const names = (list: typeof models) => list.map((m) => m.entry.label);

const audioModels = models.filter(
  (m) => modelSpecs(m.page.id).find((s) => s.label === "Audio")?.value === "Generated with the clip",
);
const imageToVideoModels = models.filter((m) => m.entry.category === "image-to-video");
const featured = featuredModelLabels(models, 3);

const TITLE = `${freeVideo ? "Free " : ""}AI Video Generator — Text & Image to Video`;
const DESCRIPTION = metaDescription(
  freeVideo
    ? `Free AI video generator: create videos from text or images with ${featured.join(", ")} and more. ${free.monthlyCredits} free credits, no credit card.`
    : `Create AI videos from text or images with ${featured.join(", ")} and more${
        audioModels.length > 0 ? ", with native audio" : ""
      }. One account and one credit balance for every model.`,
);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ai-video-generator" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/ai-video-generator" }),
};

const content: GeneratorLandingContent = {
  kind: "video",
  heading: "AI Video Generator",
  tagline: `Turn a text prompt or a photo into a finished video clip, with ${models.length} AI video models in one studio${
    freeVideo ? " — free to start" : ""
  }.`,
  intro: `${SITE_NAME} is an AI video generator that runs ${models.length} video models — including ${listPhrase(
    featured,
  )} — from a single account. Describe a shot in words, or upload an image and describe how it should move, and get a clip back ready to download.${
    audioModels.length > 0 ? " Several models generate the soundtrack together with the picture." : ""
  }`,
  steps: [
    {
      title: "Pick a video model",
      detail:
        "Fast models for iterating on an idea, flagship models for the final shot. The cost in credits is shown before you generate.",
    },
    {
      title: "Describe the shot, or upload an image",
      detail:
        "Write what happens, where, and how the camera moves. For image to video, add a still and let the prompt direct its motion.",
    },
    {
      title: "Generate and download",
      detail: "The clip renders in the cloud and lands in your gallery, ready to download or share.",
    },
  ],
  showcase: {
    label: "Seedance 2.5",
    kind: "video",
    items: SEEDANCE25_SHOWCASE_VIDEOS.slice(0, 3).map((v) => ({ url: v.url, prompt: v.prompt })),
  },
  primaryCta: { label: "Open the AI video generator", href: appHref("/generate") },
  faqs: [
    {
      question: "What is an AI video generator?",
      answer: `An AI video generator creates video clips from a text description or a still image. On ${SITE_NAME} you choose one of ${models.length} video models, write a prompt, and the model renders the clip — no camera, editing software or stock footage needed.`,
    },
    {
      question: "Can I turn an image into a video?",
      answer: `Yes. Upload a still — a product shot, a portrait, an illustration — and describe how it should move.${
        imageToVideoModels.length > 0
          ? ` Models built for this include ${listPhrase(names(imageToVideoModels))}.`
          : ""
      }`,
    },
    {
      question: "Is the AI video generator free?",
      answer: freeVideo
        ? `Yes. A free account comes with ${free.monthlyCredits} credits and no credit card — enough for ${freeVideo.clips === 1 ? "a clip" : `${freeVideo.clips} clips`} with ${freeVideo.label} (${freeVideo.credits} credits${freeVideo.clips === 1 ? "" : " each"}, ${freeVideo.seconds}s at ${freeVideo.resolution}, no watermark). Every model is open on every plan; the credits are the only limit. For longer, sharper video and a commercial licence, ${starter.label} is $${starter.priceMonthly}/month with ${starter.monthlyCredits.toLocaleString("en-US")} credits.`
        : `Signing up is free and comes with ${free.monthlyCredits} credits and no credit card, but those credits are sized for trying the image models and don't cover a video clip. Video starts on the ${starter.label} plan at $${starter.priceMonthly}/month, with ${starter.monthlyCredits.toLocaleString("en-US")} credits, watermark-free export and a commercial licence.`,
    },
    ...(audioModels.length > 0
      ? [
          {
            question: "Does the AI video generator make sound?",
            answer: `Some models do. ${listPhrase(
              names(audioModels),
            )} generate the soundtrack together with the picture, so it stays in sync with the motion; the other models generate picture only.`,
          },
        ]
      : []),
    {
      question: "How long and how sharp can the videos be?",
      answer: `It depends on the model and your plan. ${starter.label} allows clips up to ${starter.maxDurationSeconds}s at ${starter.maxResolution}, ${creator.label} up to ${creator.maxDurationSeconds}s, and ${studio.label} up to ${studio.maxDurationSeconds}s at ${studio.maxResolution.toUpperCase()}. Each model page lists that model's own duration and resolution range.`,
    },
    {
      question: "Can I use the videos commercially?",
      answer: `Yes, from the ${starter.label} plan up — paid plans include a commercial licence. The ${free.label} plan does not, although no plan watermarks its video.`,
    },
  ],
  sibling: {
    href: "/ai-image-generator",
    label: "Need a still first? Try the AI image generator",
    blurb: "Generate the frame you want, then bring it back here and animate it.",
  },
};

export default function AiVideoGeneratorPage() {
  return <GeneratorLanding content={content} />;
}
