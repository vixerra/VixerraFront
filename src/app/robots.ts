import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Disallow is for areas that should never be *crawled*; pages that merely
// shouldn't be *indexed* are handled with a noindex robots directive in their
// route group's metadata instead (see the (app), (auth) and admin layouts).
// The two don't combine: a page blocked here can't be fetched, so its noindex
// is never read, and it can still surface in results as a bare URL.
//
// /generate and /generate/image are the signed-in workspace and carry noindex;
// their public, indexable counterparts are the /generate/[model] landing pages,
// which are deliberately left crawlable.
//
// /invite/ and /c/ are the exception that carries both: their URLs contain a
// secret token, so not fetching them at all is worth more than a readable
// noindex, and neither is linked from anywhere public for a crawler to find.
const DISALLOW = [
  "/api/",
  "/edge-api/",
  "/admin",
  "/settings",
  "/dashboard",
  "/my-gallery",
  "/collections",
  "/editor",
  "/studio",
  "/presets",
  // /auth/ is deliberately NOT listed: its callback page carries a
  // noindex directive (see app/auth/layout.tsx), and a crawler has to
  // be allowed to fetch a page before it can read one.
  "/invite/",
  "/c/",
];

// The crawlers behind ChatGPT, Claude, Perplexity, Gemini, Copilot and the
// other assistants — training, search index and live user fetches alike. "*"
// already lets them in; naming them is what keeps a future tightening of "*"
// from quietly dropping Vixlens out of AI answers. A bot that matches a named
// group ignores "*" entirely, so this group has to repeat DISALLOW.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
