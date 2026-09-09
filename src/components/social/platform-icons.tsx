import type { SocialPlatform } from "@/hooks/use-social";
import { cn } from "@/lib/utils";

/**
 * Brand marks for the four publishing destinations.
 *
 * Inlined rather than imported: lucide-react ships no brand logos, which is
 * the same reason the Google "G" is hand-drawn in google-auth-button.tsx.
 * These are simplified silhouettes drawn from primitives, not the official
 * logo files — enough to be recognised at 16-20px, which is the only job
 * they have here.
 *
 * Each carries its platform's own colour. A row of four identical grey
 * glyphs would be harder to scan than the words they replaced, and brand
 * colour is the thing people actually recognise at this size.
 */

const BRAND_COLOR: Record<SocialPlatform, string> = {
  // TikTok's mark is black-on-white or white-on-black; on this dark surface
  // that's the ink token, not a colour.
  tiktok: "text-ink",
  youtube: "text-[#FF0033]",
  facebook: "text-[#1877F2]",
  instagram: "text-[#E4405F]",
};

const LABEL: Record<SocialPlatform, string> = {
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
};

/** Backgrounds for the icon tile and the card's hover glow, tinted to each
 *  platform. Kept beside the marks so a platform's colour is defined once. */
const TINT: Record<SocialPlatform, { tile: string; glow: string }> = {
  tiktok: { tile: "bg-white/8", glow: "bg-white" },
  youtube: { tile: "bg-[#FF0033]/12", glow: "bg-[#FF0033]" },
  facebook: { tile: "bg-[#1877F2]/12", glow: "bg-[#1877F2]" },
  instagram: { tile: "bg-[#E4405F]/12", glow: "bg-[#E4405F]" },
};

export function platformTint(platform: SocialPlatform) {
  return TINT[platform];
}

export function platformLabel(platform: SocialPlatform) {
  return LABEL[platform];
}

function Glyph({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "tiktok":
      // The note: stem, flag top-right, circular head bottom-left.
      return (
        <path
          fill="currentColor"
          d="M16.5 3h-3v13.1a2.6 2.6 0 1 1-2.2-2.6v-3a5.6 5.6 0 1 0 5.2 5.6V9.6a6.7 6.7 0 0 0 4 1.3v-3a3.8 3.8 0 0 1-4-3.9Z"
        />
      );
    case "youtube":
      // Rounded plate with a knocked-out play triangle.
      return (
        <>
          <rect x="2" y="5" width="20" height="14" rx="4.5" fill="currentColor" />
          <path d="M10.2 9.2v5.6L15 12z" className="fill-surface-2" />
        </>
      );
    case "facebook":
      return (
        <path
          fill="currentColor"
          d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.5V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"
        />
      );
    case "instagram":
      // Rounded square, lens, and the corner dot.
      return (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
          />
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
        </>
      );
  }
}

export function PlatformIcon({
  platform,
  className,
  /** Set when the icon is the only thing naming the platform, so screen
   *  readers and hover both still get the word. */
  labelled = false,
}: {
  platform: SocialPlatform;
  className?: string;
  labelled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-5 shrink-0", BRAND_COLOR[platform], className)}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? LABEL[platform] : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {labelled && <title>{LABEL[platform]}</title>}
      <Glyph platform={platform} />
    </svg>
  );
}
