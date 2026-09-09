// DUPLIQUÉ dans aiVideo-backend/src/lib/showcase-media.ts — garder synchronisé.
// Curated sample outputs used by the marketing showcase grid and prompt
// gallery. All media is served locally from public/media/videos — no
// external CDN is referenced. marketing.mp4 / ads.mp4 are reserved for
// creator-use-cases.tsx and never assigned here.

export type ShowcaseVideo = {
  id: string;
  url: string;
  prompt: string;
  tile: "wide" | "tall" | "square"; // grid tile shape, independent of source aspect
};

const LOCAL_VIDEOS = {
  seedance: "/media/videos/01_seedance_2_0_1b29ad9ce6.mp4",
  makeupGirl: "/media/videos/makeup-girl.mp4",
  model: "/media/videos/model.mp4",
  msc: "/media/videos/msc6H2R1htn6Mzjy_OPku_video.mp4",
  sippo: "/media/videos/sippo.mp4",
} as const;

// Legacy Seedance 2.0 set — 9 entries, still cycling the full 5-clip local
// pool (release-announcement-modal.tsx and the /prompts page draw from
// this one, not the trimmed SEEDANCE25 set below). No two *adjacent*
// entries share a clip.
export const SHOWCASE_VIDEOS: ShowcaseVideo[] = [
  {
    id: "friends-sofa",
    url: LOCAL_VIDEOS.seedance,
    prompt: "Two friends catching up on a lazy Sunday afternoon in a cozy, lived-in apartment",
    tile: "wide",
  },
  {
    id: "chocolate-product",
    url: LOCAL_VIDEOS.makeupGirl,
    prompt: "Ultra high-end product shot: dark chocolate bar snapping in half, macro detail",
    tile: "square",
  },
  {
    id: "parrot-jungle",
    url: LOCAL_VIDEOS.model,
    prompt: "A girl dancing kpop",
    tile: "wide",
  },
  {
    id: "man-dancing",
    url: LOCAL_VIDEOS.msc,
    prompt: "A man dancing",
    tile: "tall",
  },
  {
    id: "falcon-desert",
    url: LOCAL_VIDEOS.seedance,
    prompt: "A falcon launching from a gloved hand in the Arabian desert at golden hour",
    tile: "wide",
  },
  {
    id: "nightclub-performer",
    url: LOCAL_VIDEOS.sippo,
    prompt: "A performer on stage under warm golden spotlights in a dimly lit nightclub",
    tile: "tall",
  },
  {
    id: "studio-portrait",
    url: LOCAL_VIDEOS.model,
    prompt: "Studio portrait brought to life with subtle, natural motion",
    tile: "square",
  },
  {
    id: "cinematic-scene",
    url: LOCAL_VIDEOS.msc,
    prompt: "Cinematic wide shot with natural camera movement and realistic lighting",
    tile: "wide",
  },
  {
    id: "reference-scene",
    url: LOCAL_VIDEOS.makeupGirl,
    prompt: "Multi-reference scene composition with consistent subject identity",
    tile: "square",
  },
];

// Poster/thumbnail frames for the video grid fall back to a CSS gradient
// (see ShowcaseTile) rather than a separate image asset, so there is
// nothing to fetch before the video itself is ready.

// Seedance 2.5 set — capped at exactly 4 entries, one per distinct local
// clip (seedance / makeup-girl / model / sippo — msc6H2R1... is left out of
// this set on purpose, kept free for SHOWCASE_VIDEOS/personas.tsx use
// instead), so showcase-tabs.tsx's Seedance 2.5 gallery never repeats a
// clip across its own tiles. Each entry also doubles as the single spotlight
// clip for one other component (hero.tsx, features-showcase.tsx,
// model-carousel.tsx, personas.tsx) — see each file's own comment.
export const SEEDANCE25_SHOWCASE_VIDEOS: ShowcaseVideo[] = [
  {
    id: "anime-breathing-clash",
    url: LOCAL_VIDEOS.seedance,
    prompt:
      "Live-action anime adaptation — twin breathing-technique fighters clash on a storm-battered coastal cliff shrine at dusk, whip-pan cuts every 1.5s and volumetric fire FX",
    tile: "square",
  },
  {
    id: "flamenco-practice-room",
    url: LOCAL_VIDEOS.makeupGirl,
    prompt:
      "A flamenco dancer alone in a dark practice room, driving a long footwork sequence until dust lifts off the boards and hangs in the light",
    tile: "square",
  },
  {
    id: "night-rally-car",
    url: LOCAL_VIDEOS.model,
    prompt:
      "A night stage of a gravel rally — a boxy 1980s four-wheel-drive rally car comes through a long left-hander in the pines",
    tile: "square",
  },
  {
    id: "leather-boots-commercial",
    url: LOCAL_VIDEOS.sippo,
    prompt:
      "A 30-second commercial for a pair of hand-welted leather boots, one unbroken low tracking shot held at ankle height",
    tile: "square",
  },
];
