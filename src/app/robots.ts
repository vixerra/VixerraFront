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
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
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
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
