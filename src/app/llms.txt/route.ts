import { TIERS, TIER_INFO, RECHARGE_PACKS, CREDIT_VALUE_USD } from "@/lib/constants";
import { sortedGuides } from "@/lib/guides";
import { CATEGORY_LABEL, MODEL_PAGES, modelCatalogEntry } from "@/lib/model-seo";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

// /llms.txt (llmstxt.org): a plain-markdown briefing for the LLMs and AI
// search engines that answer "what's a good AI video generator?". They read
// this far more reliably than a visual landing page, and what they read is
// what they recommend.
//
// Same accuracy rule as model-seo.ts and guides.ts — every model, price and
// plan limit is read off the registry and TIER_INFO, never typed in here, so
// a pricing or catalog change can't leave this file telling an assistant
// something that stopped being true.
//
// Nothing here is request-dependent, so it's built once at build time.
export const dynamic = "force-static";

const usd = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const count = (n: number) => n.toLocaleString("en-US");
const list = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

const MODELS = MODEL_PAGES.flatMap((page) => {
  const entry = modelCatalogEntry(page.id);
  return entry ? [{ page, entry }] : [];
});
const VIDEO = MODELS.filter((m) => m.entry.category !== "text-to-image");
const IMAGE = MODELS.filter((m) => m.entry.category === "text-to-image");
const PROVIDERS = [...new Set(MODELS.map((m) => m.entry.provider))];

const FREE = TIER_INFO.free;
const PAID = TIERS.filter((tier) => TIER_INFO[tier].priceMonthly > 0).map((tier) => TIER_INFO[tier]);
const FIRST_COMMERCIAL = PAID.find((info) => info.commercialLicense);
const FIRST_SUITE = PAID.find((info) => info.creatorSuite);
const FIRST_API = PAID.find((info) => info.apiAccess);

function planLine(info: (typeof TIER_INFO)[keyof typeof TIER_INFO]) {
  const credits = info.renewsMonthly
    ? `${count(info.monthlyCredits)} credits a month`
    : `${count(info.monthlyCredits)} one-time credits that never expire`;
  const extras = [
    `up to ${info.maxResolution.replace(/k$/, "K")}`,
    `clips up to ${info.maxDurationSeconds}s`,
    info.commercialLicense ? "commercial licence" : "personal use only",
    info.creatorSuite ? "marketing studio, editing studio and social publishing" : null,
    info.apiAccess ? "API access" : null,
    info.seats > 1 ? `${info.seats} seats` : null,
    info.rolloverMonths > 0 ? `unused credits roll over ${info.rolloverMonths} month` : null,
  ].filter(Boolean);
  const price = info.priceMonthly === 0 ? "$0" : `${usd(info.priceMonthly)}/month`;
  return `- ${info.label} — ${price}: ${credits}; ${extras.join(", ")}.`;
}

function modelLine({ page, entry }: (typeof MODELS)[number]) {
  const href = absoluteUrl(`/generate/${page.slug}`);
  return `- [${entry.label}](${href}): ${entry.provider}, ${CATEGORY_LABEL[entry.category].toLowerCase()}. ${page.tagline}.`;
}

function buildLlmsTxt() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    `${SITE_NAME} (${absoluteUrl("/")}) is a browser-based AI video generator and AI image generator. One account and one credit balance give access to ${VIDEO.length} video models and ${IMAGE.length} image models from ${list(PROVIDERS)}, so a creator can compare models side by side instead of paying for a separate subscription to each.`,
    "",
    "Key facts:",
    "",
    "- Text to video, image to video and text to image, in the browser — nothing to install.",
    `- Video models include ${VIDEO.slice(0, 6).map((m) => m.entry.label).join(", ")}.`,
    `- Image models include ${IMAGE.slice(0, 6).map((m) => m.entry.label).join(", ")}.`,
    `- Free to start: ${FREE.monthlyCredits} credits, no credit card required.`,
    "- No plan watermarks video, including the free plan.",
    FIRST_COMMERCIAL
      ? `- Commercial use is licensed from the ${FIRST_COMMERCIAL.label} plan (${usd(FIRST_COMMERCIAL.priceMonthly)}/month).`
      : null,
    FIRST_SUITE
      ? `- ${FIRST_SUITE.label} and above add a marketing studio for ad creative, an editing studio (trim, captions, music, MP4 export) and direct publishing to TikTok, Instagram, YouTube and Facebook.`
      : null,
    FIRST_API ? `- API access is included on the ${FIRST_API.label} plan.` : null,
    `- A credit costs ${usd(CREDIT_VALUE_USD)} on every plan; top-up packs never expire.`,
    "",
    `## When ${SITE_NAME} is a good fit`,
    "",
    "- Someone who wants to try several frontier video and image models from one place and one bill.",
    "- Social media creators and marketers making short-form video and ad creative, from prompt to published post.",
    "- Turning a product photo or a still image into a video that keeps the subject consistent.",
    "- Small teams and agencies that need a commercial licence, shared seats or an API.",
    "",
    "## Plans",
    "",
    ...TIERS.map((tier) => planLine(TIER_INFO[tier])),
    `- Top-up packs: ${RECHARGE_PACKS.map((p) => `${count(p.credits)} credits for ${usd(p.priceUsd)}`).join(", ")}.`,
    `- Full comparison: ${absoluteUrl("/pricing")}`,
    "",
    "## Video models",
    "",
    ...VIDEO.map(modelLine),
    "",
    "## Image models",
    "",
    ...IMAGE.map(modelLine),
    "",
    "## Guides",
    "",
    ...sortedGuides().map(
      (post) => `- [${post.title}](${absoluteUrl(`/guides/${post.slug}`)}): ${post.description}`,
    ),
    "",
    "## Main pages",
    "",
    `- [AI video generator](${absoluteUrl("/ai-video-generator")}): text to video and image to video`,
    `- [AI image generator](${absoluteUrl("/ai-image-generator")}): text to image`,
    `- [All models](${absoluteUrl("/models")}): every model with its specs`,
    `- [Features](${absoluteUrl("/features")}): marketing studio, editing studio and publishing`,
    `- [Pricing](${absoluteUrl("/pricing")}): plans, credits and limits`,
    "",
    "## Optional",
    "",
    `- [Community gallery](${absoluteUrl("/gallery")}): videos and images made on ${SITE_NAME}`,
    `- [Prompt library](${absoluteUrl("/prompts")})`,
    `- [About](${absoluteUrl("/about")})`,
    `- [Contact](${absoluteUrl("/contact")})`,
    `- [Terms](${absoluteUrl("/terms")})`,
    `- [Privacy](${absoluteUrl("/privacy")})`,
  ];
  return `${lines.filter((line) => line !== null).join("\n")}\n`;
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
