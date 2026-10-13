import { appHref } from "@/lib/hosts";

/**
 * "New feature" launches, shown by ReleaseAnnouncementModal (mounted once, in
 * the root layout). The current one, Vixlens Genjutsu, is what the dialog
 * opens with on its own; the landing launch carousel opens each slide's
 * film through the same dialog instead of shipping a second player.
 */
export const OPEN_ANNOUNCEMENT_EVENT = "vixlens:open-announcement";

export type Announcement = "genjutsu" | "influencer";

export const CURRENT_ANNOUNCEMENT: Announcement = "genjutsu";

export function openFeatureAnnouncement(id: Announcement = CURRENT_ANNOUNCEMENT) {
  window.dispatchEvent(new CustomEvent<Announcement>(OPEN_ANNOUNCEMENT_EVENT, { detail: id }));
}

export type LaunchFilm = {
  webm: string;
  mp4: string;
  poster: string;
  duration: string;
};

// 720p re-encodes of the 1080p launch film (silent, 26s): VP9 first at
// ~1.7 MB, H.264 as the fallback for browsers without WebM. Nothing here is
// fetched until the dialog mounts the <video>.
export const INFLUENCER_FILM: LaunchFilm = {
  webm: "/marketing/influencer/announcement.webm",
  mp4: "/marketing/influencer/announcement.mp4",
  poster: "/marketing/influencer/announcement-poster.webp",
  duration: "0:26",
};

// 720p re-encodes of the 1080p master (silent, 15s): VP9 at ~1.2 MB, and
// H.264 (~1.3 MB, faststart) for browsers without WebM. The dialog is at most
// 672px wide, so 1080p only cost bytes. The poster is its closing
// frame, which carries the whole lockup: headline, both modes and the CTA.
export const GENJUTSU_FILM: LaunchFilm = {
  webm: "/marketing/genjutsu/announcement.webm",
  mp4: "/marketing/genjutsu/announcement.mp4",
  poster: "/marketing/genjutsu/announcement-poster.webp",
  duration: "0:15",
};

/** Signed-out visitors sign up first; the app shell would otherwise send
 *  them to /login, which is the wrong door for someone new. */
function launchHref(path: string, signedIn: boolean): string {
  return appHref(signedIn ? path : `/signup?next=${encodeURIComponent(path)}`);
}

export function influencerHref(signedIn: boolean): string {
  return launchHref("/influencer", signedIn);
}

export function genjutsuHref(signedIn: boolean): string {
  return launchHref("/genjutsu", signedIn);
}
