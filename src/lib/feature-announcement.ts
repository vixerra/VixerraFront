import { appHref } from "@/lib/hosts";

/**
 * The current "new feature" launch — AI Influencer. Shared by the landing
 * banner and ReleaseAnnouncementModal (mounted once, in the root layout), so
 * the banner opens that same dialog instead of shipping a second player.
 */
export const OPEN_ANNOUNCEMENT_EVENT = "vixlens:open-announcement";

export function openFeatureAnnouncement() {
  window.dispatchEvent(new Event(OPEN_ANNOUNCEMENT_EVENT));
}

// 720p re-encodes of the 1080p launch film (silent, 26s): VP9 first at
// ~1.7 MB, H.264 as the fallback for browsers without WebM. Nothing here is
// fetched until the dialog mounts the <video>.
export const INFLUENCER_FILM = {
  webm: "/marketing/influencer/announcement.webm",
  mp4: "/marketing/influencer/announcement.mp4",
  poster: "/marketing/influencer/announcement-poster.webp",
  duration: "0:26",
} as const;

/** Signed-out visitors sign up first; the app shell would otherwise send
 *  them to /login, which is the wrong door for someone new. */
export function influencerHref(signedIn: boolean): string {
  return appHref(signedIn ? "/influencer" : `/signup?next=${encodeURIComponent("/influencer")}`);
}
