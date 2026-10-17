// The social card every page's opengraph-image route draws: the page's own
// title on the brand's ink ground, so a shared link previews as that page
// rather than as the one stock image every page used to carry.
//
// Satori (behind next/og) supports a subset of CSS — flexbox only, inline
// styles, no CSS variables — hence the hex values copied from globals.css.

import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK_GROUND = "#211927";
const INK = "#f0efed";
const MUTED = "#b9b3bd";
const BRAND = "#f2ff59";

export function ogCard({
  eyebrow,
  title,
  subtitle,
}: {
  /** Small uppercase line above the title: "Video model · Kling". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: INK_GROUND,
          color: INK,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 20, height: 20, borderRadius: 999, background: BRAND }} />
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow && (
            <div style={{ fontSize: 26, color: BRAND, textTransform: "uppercase", letterSpacing: 3 }}>
              {eyebrow}
            </div>
          )}
          <div style={{ fontSize: title.length > 40 ? 64 : 80, fontWeight: 700, lineHeight: 1.05 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 30, color: MUTED, lineHeight: 1.3, maxWidth: 980 }}>
              {subtitle.length > 140 ? `${subtitle.slice(0, 137)}…` : subtitle}
            </div>
          )}
        </div>

        <div style={{ display: "flex", height: 8, width: 160, background: BRAND, borderRadius: 4 }} />
      </div>
    ),
    OG_SIZE,
  );
}
