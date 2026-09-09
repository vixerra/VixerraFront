import type { MetadataRoute } from "next";
import { GUIDE_POSTS, guideDate } from "@/lib/guides";
import { MODEL_PAGES } from "@/lib/model-seo";
import { fetchPublicGenerations } from "@/lib/public-content";
import { absoluteUrl } from "@/lib/seo";

// Only public, indexable URLs belong here. Everything behind AppShell carries
// a noindex directive (see the (app)/(auth)/admin layouts), and listing a
// noindex page in a sitemap is a contradiction Search Console reports as an
// error rather than a hint.
//
// Revalidated hourly so a newly shared generation is discoverable without a
// redeploy. The gallery fetch degrades to an empty list if the API is
// unreachable, which costs those URLs a crawl hint rather than failing the
// build — the routes themselves are still linked from /gallery.
export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/models", priority: 0.9, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/features", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guides", priority: 0.8, changeFrequency: "weekly" },
  { path: "/gallery", priority: 0.7, changeFrequency: "daily" },
  { path: "/prompts", priority: 0.7, changeFrequency: "weekly" },
  { path: "/about", priority: 0.4, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.4, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const generations = await fetchPublicGenerations();

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...MODEL_PAGES.map((page) => ({
      url: absoluteUrl(`/generate/${page.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...GUIDE_POSTS.map((post) => ({
      url: absoluteUrl(`/guides/${post.slug}`),
      lastModified: new Date(guideDate(post)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...generations.map((item) => ({
      url: absoluteUrl(`/gallery/${item.id}`),
      lastModified: item.createdAt ? new Date(item.createdAt) : now,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
