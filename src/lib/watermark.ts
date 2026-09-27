/**
 * The Free plan's watermark: a centered Vixlens mark on every result, on
 * screen and in the downloaded file (TIER_INFO.watermark).
 *
 * ## Why it lives in the browser
 *
 * The API is a Deno Edge Function with 2s of CPU per request and no ffmpeg,
 * so it cannot re-encode a video, and a separate media pipeline was ruled
 * out (2026-09-27). The browser already can: the Editing Studio renders MP4s
 * with WebCodecs (lib/editor/export.ts), and this reuses its encoder, its
 * seeking and its same-origin media proxy.
 *
 * Two halves that must look the same:
 *   - on screen, <ResultWatermark> lays the mark over the player;
 *   - in the file, burnWatermark() (lib/watermark-burn.ts, loaded only when
 *     a download starts) draws it into the pixels.
 * Both size the wordmark off the media's SHORT side (WATERMARK_FONT_SCALE),
 * so the mark reads the same in a 9:16 clip and a 16:9 one.
 *
 * ## What this does not do
 *
 * It is not protection. The API still stores and serves the clean file, and
 * the signed URL the player streams from is that file — anyone who opens
 * the network tab can save it. The overlay and the burned-in download make
 * the watermark what a Free user normally gets; making it unremovable needs
 * the server to hold only a watermarked copy.
 */

import { TIER_INFO, type Tier } from "@/lib/constants";

export const WATERMARK_TEXT = "Vixlens";
export const WATERMARK_OPACITY = 0.55;
/** Wordmark font size, as a fraction of the media's short side. */
export const WATERMARK_FONT_SCALE = 0.085;
/** The mark beside the wordmark, and the gap between them, in ems. */
export const WATERMARK_MARK_EM = 1.15;
export const WATERMARK_GAP_EM = 0.3;

/**
 * Whether results made on `tier` carry the watermark.
 *
 * Takes useMe()'s `effectiveTier`, the same one every capability gate reads:
 * a Free member of a paid team generates on the owner's plan, so their work
 * is as clean as the owner's. Undefined means "not known yet" and returns
 * false, so a paid user doesn't see the mark flash in while /me loads. A tier
 * this build doesn't recognise returns true: an unknown plan is not a licence
 * to export clean.
 */
export function needsWatermark(tier: string | undefined | null): boolean {
  if (!tier) return false;
  return TIER_INFO[tier as Tier]?.watermark ?? true;
}
