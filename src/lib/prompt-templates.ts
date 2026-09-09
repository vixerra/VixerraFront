// Full generation "templates" for the /prompts page: each pairs a local
// sample video (served from public/media, no external CDN) with a
// structured, shot-by-shot prompt template (ByteDance's bracket-tag format —
// 【Style】/【Duration】/【Main Character】 plus timestamped shots) and a
// suggested full parameter set — duration, resolution, aspect ratio,
// camera, audio.
//
// Honesty note: the structured prompt text is a curated template *inspired
// by* the kind of shot it describes, written to be copied and adapted — not
// a claim that this exact text produced the attached clip. Same for the
// parameters: valid, in-range defaults (see SEEDANCE2_* in constants.ts),
// not literal source settings. The UI must keep both framed as
// templates/suggestions, never as "the prompt that generated this."
//
// Two of these (fal-pro-*) use their own local clip; the other nine reuse
// SHOWCASE_VIDEOS (already used on the landing page).

import { SHOWCASE_VIDEOS } from "@/lib/showcase-media";
import { SEEDANCE2_MODEL_ID, SEEDANCE2_RESOLUTIONS, SEEDANCE2_ASPECT_RATIOS } from "@/lib/constants";

export type PromptTemplate = {
  id: string;
  videoUrl: string;
  prompt: string;
  duration: number;
  resolution: (typeof SEEDANCE2_RESOLUTIONS)[number];
  aspectRatio: (typeof SEEDANCE2_ASPECT_RATIOS)[number];
  cameraFixed: boolean;
  generateAudio: boolean;
};

function showcaseUrl(id: string): string {
  const source = SHOWCASE_VIDEOS.find((v) => v.id === id);
  if (!source) throw new Error(`Unknown showcase video id: ${id}`);
  return source.url;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "fal-pro-race-car",
    videoUrl: "/media/videos/sippo.mp4",
    prompt: `【Style】Cinematic motorsport commercial, hyperrealism, dynamic multi-angle camera work, dramatic storm lighting, epic tone.
【Duration】12 seconds
【Main Character】A bright blue race car, part of a pack racing through a blizzard.
[00:00-00:05] Shot 1: Ground-level approach.
Scene: Low-angle shot at the edge of a snow-covered racetrack.
Action: The blue race car roars past camera first, spraying snow, several rivals close behind through the harsh snowstorm.
Key detail: Storm lights flare and streak across the lens as each car passes.
[00:05-00:12] Shot 2: The reveal.
Scene: Same track, camera now pulling straight up and back.
Action: The camera gradually rises, revealing the full pack mid-race and the scale of the storm around them.
Key detail: Wind-blown snow and light trails should feel physically heavy, not decorative.`,
    duration: 12,
    resolution: "1080p",
    aspectRatio: "16:9",
    cameraFixed: false,
    generateAudio: true,
  },
  {
    id: "fal-pro-skier",
    videoUrl: "/media/videos/model.mp4",
    prompt: `【Style】Cinematic sports commercial, hyperrealism, smooth tracking camera, crisp winter natural light, exhilarating tone.
【Duration】8 seconds
【Main Character】A skier in bright gear, mid-run on a fresh powder slope.
[00:00-00:04] Shot 1: The turn.
Scene: Wide alpine slope, morning light, untouched snow.
Action: The skier carves a turn, smiling, kicking up a large arc of powder that catches the light.
Key detail: Snow spray should hang in the air a beat longer than gravity expects — the "hero" moment.
[00:04-00:08] Shot 2: Acceleration.
Scene: Same slope, camera now moving alongside at speed.
Action: The skier accelerates downhill; the camera tracks smoothly in parallel, matching velocity.
Key detail: Camera stays level and close — the sense of speed comes from the passing scenery, not shake.`,
    duration: 8,
    resolution: "720p",
    aspectRatio: "16:9",
    cameraFixed: false,
    generateAudio: true,
  },
  {
    id: "friends-sofa",
    videoUrl: showcaseUrl("friends-sofa"),
    prompt: `【Style】Slice-of-life mockumentary, hyperrealism, handheld-feel camera, warm natural indoor light, cozy relaxed tone.
【Duration】8 seconds
【Main Character】Two friends, mid-conversation, sunk into a lived-in sofa.
[00:00-00:04] Shot 1: Settling in.
Scene: A cozy, cluttered-but-warm apartment living room, soft afternoon light through a window.
Action: The two friends lean in, mid-story, one gesturing with their hands as they talk.
Key detail: Micro-expressions do the work — a raised eyebrow, a stifled laugh — before any dialogue lands.
[00:04-00:08] Shot 2: The laugh.
Scene: Same sofa, camera drifts slightly closer.
Action: One friend says something that lands; both break into genuine, slightly-too-loud laughter.
Key detail: Laughter should look unscripted — asymmetric, a little messy, not camera-aware.`,
    duration: 8,
    resolution: "720p",
    aspectRatio: "16:9",
    cameraFixed: false,
    generateAudio: true,
  },
  {
    id: "chocolate-product",
    videoUrl: showcaseUrl("chocolate-product"),
    prompt: `【Style】Ultra-premium product commercial, macro hyperrealism, fixed-camera studio shot, dramatic rim lighting, indulgent tone.
【Duration】5 seconds
【Main Character】A single dark chocolate bar, lit like a hero product.
[00:00-00:02] Shot 1: The hold.
Scene: Macro studio setup, chocolate bar centered on a dark reflective surface.
Action: The bar sits still under a slow-building rim light, texture and sheen fully visible.
Key detail: Every ridge and matte-to-gloss transition on the surface should read in crisp macro detail.
[00:02-00:05] Shot 2: The snap.
Scene: Same macro framing, camera locked off.
Action: The bar snaps cleanly in half in a single decisive motion; small chocolate shards catch the light as they fall.
Key detail: The snap is the entire payoff — sharp, sudden, satisfying, with the crumb texture visible at the break.`,
    duration: 5,
    resolution: "1080p",
    aspectRatio: "1:1",
    cameraFixed: true,
    generateAudio: false,
  },
  {
    id: "parrot-jungle",
    videoUrl: showcaseUrl("parrot-jungle"),
    prompt: `【Style】Nature documentary, hyperrealism, sweeping aerial drone camera, golden-hour natural light, awe-inspiring tone.
【Duration】10 seconds
【Main Character】A single vividly colored parrot in open flight.
[00:00-00:05] Shot 1: Canopy level.
Scene: Dense tropical jungle canopy, low golden-hour sun raking across the treetops.
Action: The parrot bursts from the tree line into open air, wings beating hard to gain altitude.
Key detail: Individual feathers should catch and scatter the low sunlight as the wings move.
[00:05-00:10] Shot 2: The glide.
Scene: Open air above the canopy, drone camera now flying alongside.
Action: The parrot levels out into a smooth glide; the camera banks gently to track it from the side.
Key detail: Camera motion should feel like a real chase drone — slight lag, natural drift, never perfectly locked.`,
    duration: 10,
    resolution: "720p",
    aspectRatio: "16:9",
    cameraFixed: false,
    generateAudio: true,
  },
  {
    id: "man-dancing",
    videoUrl: showcaseUrl("man-dancing"),
    prompt: `【Style】Music video vignette, hyperrealism, dynamic handheld camera, moody colored stage light, energetic tone.
【Duration】8 seconds
【Main Character】A man mid-routine, fully committed to the beat.
[00:00-00:04] Shot 1: Build-up.
Scene: A moodily lit room washed in a single saturated color (deep blue or red).
Action: He starts with small, sharp isolations — shoulders, head — locked to an implied beat.
Key detail: Every movement should hit on a clear accent, even without audible music.
[00:04-00:08] Shot 2: Release.
Scene: Same space, camera pulls back slightly and starts to drift with him.
Action: The isolations open up into a full-body sequence, energy building to a peak.
Key detail: Motion blur on fast limbs is welcome here — it should feel kinetic, not stabilized-flat.`,
    duration: 8,
    resolution: "720p",
    aspectRatio: "9:16",
    cameraFixed: false,
    generateAudio: true,
  },
  {
    id: "nightclub-performer",
    videoUrl: showcaseUrl("nightclub-performer"),
    prompt: `【Style】Concert/live performance film, hyperrealism, slow dolly camera, warm spotlight lighting, electric tone.
【Duration】8 seconds
【Main Character】A performer, centered under a spotlight on a small stage.
[00:00-00:04] Shot 1: The hold.
Scene: A dim, intimate nightclub, haze catching a single warm spotlight.
Action: The performer holds a powerful pose at the mic, chest rising with a held breath before the next line.
Key detail: Haze in the spotlight beam should be volumetric and visibly drifting, not a flat glow.
[00:04-00:08] Shot 2: The move.
Scene: Same stage, camera on a slow dolly-in.
Action: The performer breaks the hold with a sudden, confident gesture toward the unseen crowd.
Key detail: The crowd stays implied — occasional silhouettes and hands at the frame's bottom edge, never fully shown.`,
    duration: 8,
    resolution: "720p",
    aspectRatio: "9:16",
    cameraFixed: false,
    generateAudio: true,
  },
  {
    id: "falcon-desert",
    videoUrl: showcaseUrl("falcon-desert"),
    prompt: `【Style】Wildlife documentary, hyperrealism, slow-motion tracking camera, golden-hour natural light, majestic tone.
【Duration】8 seconds
【Main Character】A falcon, launching from a falconer's gloved hand.
[00:00-00:04] Shot 1: The launch.
Scene: Open Arabian desert at golden hour, low dunes stretching to the horizon.
Action: The falcon pushes off the glove in a single explosive wingbeat, talons releasing last.
Key detail: Capture the exact instant of separation — the glove's leather flexing under the push-off.
[00:04-00:08] Shot 2: The climb.
Scene: Open desert sky, camera now tracking alongside the bird.
Action: The falcon climbs and banks, wings cutting sharp silhouettes against the warm sky.
Key detail: Sand kicked up by the launch should still be settling in frame as the bird climbs away.`,
    duration: 8,
    resolution: "720p",
    aspectRatio: "16:9",
    cameraFixed: false,
    generateAudio: true,
  },
  {
    id: "studio-portrait",
    videoUrl: showcaseUrl("studio-portrait"),
    prompt: `【Style】Editorial beauty portrait, hyperrealism, fixed-camera real-shot feel, soft studio lighting, quiet contemplative tone.
【Duration】6 seconds
【Main Character】A studio portrait subject, lit softly against a neutral backdrop.
[00:00-00:03] Shot 1: The stillness.
Scene: Clean studio backdrop, soft key light with gentle falloff.
Action: The subject holds a composed, direct gaze; only the smallest natural motion — a breath, a blink.
Key detail: Skin texture and fine hair strands should read with real, unretouched detail.
[00:03-00:06] Shot 2: The shift.
Scene: Same fixed framing.
Action: The subject's expression softens slightly — the faintest hint of a smile forming at the corner of the mouth.
Key detail: The change should be subtle enough to almost miss — natural micro-expression, not a performed smile.`,
    duration: 6,
    resolution: "1080p",
    aspectRatio: "1:1",
    cameraFixed: true,
    generateAudio: false,
  },
  {
    id: "cinematic-scene",
    videoUrl: showcaseUrl("cinematic-scene"),
    prompt: `【Style】Cinematic establishing shot, hyperrealism, smooth crane camera movement, naturalistic lighting, atmospheric tone.
【Duration】8 seconds
【Main Character】The environment itself — no single human subject, the scene is the star.
[00:00-00:04] Shot 1: The establish.
Scene: A wide environment with strong depth (a street, a landscape, or a large interior).
Action: The camera holds low and wide, letting ambient motion — light, weather, distant movement — read naturally.
Key detail: Foreground, midground, and background should all have independent, believable motion.
[00:04-00:08] Shot 2: The push.
Scene: Same environment, camera now rising and pushing forward on a smooth crane move.
Action: The frame opens up as the camera gains height, revealing more of the space.
Key detail: The movement should feel mechanically smooth — a real crane, not a handheld drift.`,
    duration: 8,
    resolution: "720p",
    aspectRatio: "16:9",
    cameraFixed: false,
    generateAudio: false,
  },
  {
    id: "reference-scene",
    videoUrl: showcaseUrl("reference-scene"),
    prompt: `【Style】Continuity/reference test, hyperrealism, fixed-camera real-shot feel, neutral studio lighting, technical tone.
【Duration】8 seconds
【Main Character】A subject built from multiple reference images, tested for identity consistency.
[00:00-00:04] Shot 1: The anchor pose.
Scene: Neutral studio setting, even flat lighting with no harsh shadows.
Action: The subject holds a static pose matching the primary reference image exactly.
Key detail: Facial proportions, hair, and clothing must match the reference frame-for-frame at this point.
[00:04-00:08] Shot 2: Controlled motion.
Scene: Same setting, camera fixed.
Action: The subject turns their head slightly and shifts weight, testing identity consistency through motion.
Key detail: Identity should hold rock-solid through the turn — no drift in facial structure as the angle changes.`,
    duration: 8,
    resolution: "720p",
    aspectRatio: "1:1",
    cameraFixed: false,
    generateAudio: false,
  },
];

export function buildTemplateText(t: PromptTemplate): string {
  return [
    t.prompt,
    "",
    "---",
    `Model: Seedance 2.0`,
    `Duration: ${t.duration}s`,
    `Resolution: ${t.resolution === "4k" ? "4K" : t.resolution}`,
    `Aspect ratio: ${t.aspectRatio}`,
    `Camera: ${t.cameraFixed ? "Fixed" : "Dynamic"}`,
    `Audio: ${t.generateAudio ? "On" : "Off"}`,
  ].join("\n");
}

export function buildGenerateUrl(t: PromptTemplate): string {
  const params = new URLSearchParams({
    model: SEEDANCE2_MODEL_ID,
    prompt: t.prompt,
    duration: String(t.duration),
    resolution: t.resolution,
    aspectRatio: t.aspectRatio,
  });
  return `/generate?${params.toString()}`;
}
