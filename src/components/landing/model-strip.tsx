import Link from "next/link";
import { Marquee } from "@/components/marketing/marquee";
import { VIDEO_MODELS, IMAGE_MODELS } from "@/lib/constants";
import { modelPageHref } from "@/lib/model-seo";

// Featured models lead the marquee; everything else keeps registry order.
const FEATURED_IDS = ["bytedance/seedance-2.5", "kling/3.0", "openai/gpt-image-2", "google/nano-banana-pro"];
const featuredRank = (id: string) => {
  const i = FEATURED_IDS.indexOf(id.trim());
  return i === -1 ? FEATURED_IDS.length : i;
};
const ALL_MODELS = [...VIDEO_MODELS, ...IMAGE_MODELS].sort(
  (a, b) => featuredRank(a.id) - featuredRank(b.id),
);

// Each pill links to that model's landing page. This strip renders on both /
// and /features, which is what keeps the ~26 pages under /generate/[model] one
// click from the two strongest pages on the site instead of reachable only
// through /models and the sitemap. A model without a landing page still
// renders — as a plain span, not a dead link.
export function ModelStrip() {
  return (
    <div className="border-y border-line bg-surface-2/50 py-8">
      <p className="text-center text-caption text-muted">Powered by state-of-the-art models</p>
      <Marquee className="mt-4">
        {ALL_MODELS.map((model) => {
          const href = modelPageHref(model.id);
          const content = (
            <>
              <span className="font-mono text-caption text-ink-soft">{model.label}</span>
              <span className="text-caption text-muted">· {model.provider}</span>
            </>
          );
          const className =
            "flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 whitespace-nowrap";

          return href ? (
            <Link
              key={model.id}
              href={href}
              className={`${className} transition-colors hover:border-border-strong hover:bg-surface-3`}
            >
              {content}
            </Link>
          ) : (
            <span key={model.id} className={className}>
              {content}
            </span>
          );
        })}
      </Marquee>
    </div>
  );
}
