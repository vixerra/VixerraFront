/**
 * Timeline arithmetic and the clip operations the studio's toolbar drives.
 *
 * Everything here is pure: it takes a Project and returns a new one (or a
 * derived layout), so the editor's undo stack is just a list of past
 * Projects and React never has to diff anything by hand.
 */

import {
  TRANSITIONS,
  type Clip,
  type Project,
  type TextOverlay,
  type TransitionId,
} from "./types";

/** How long a clip occupies the timeline, after trim and speed. */
export function clipDuration(clip: Clip): number {
  return Math.max(0, (clip.out - clip.in) / clip.speed);
}

export function transitionOverlaps(type: TransitionId): boolean {
  return TRANSITIONS.find((t) => t.id === type)?.overlaps ?? false;
}

export type PlacedClip = {
  clip: Clip;
  /** TIMELINE seconds. */
  start: number;
  end: number;
  duration: number;
  /**
   * How long this clip's opening transition runs, already clamped to
   * something both neighbours can actually afford. Zero for the first clip
   * and for a hard cut.
   */
  transitionDuration: number;
};

export type TimelineLayout = {
  placed: PlacedClip[];
  duration: number;
};

/**
 * Lays clips end to end, pulling each one back under its predecessor by the
 * length of an overlapping transition.
 *
 * The clamp matters: a 1s dissolve between two 0.4s clips would otherwise
 * produce a negative start and a timeline shorter than one of its own
 * clips. Half of the shorter neighbour is the most that can overlap and
 * still leave a moment of each clip playing alone.
 */
export function timelineLayout(project: Project): TimelineLayout {
  const placed: PlacedClip[] = [];
  let cursor = 0;

  project.clips.forEach((clip, index) => {
    const duration = clipDuration(clip);
    const previous = placed[index - 1];

    let transitionDuration = 0;
    if (previous && transitionOverlaps(clip.transition.type)) {
      transitionDuration = Math.max(
        0,
        Math.min(clip.transition.duration, previous.duration / 2, duration / 2),
      );
    }

    const start = Math.max(0, cursor - transitionDuration);
    placed.push({ clip, start, end: start + duration, duration, transitionDuration });
    cursor = start + duration;
  });

  return { placed, duration: cursor };
}

/** Where in the SOURCE file a timeline moment falls for a given clip. */
export function sourceTimeFor(placed: PlacedClip, timelineTime: number): number {
  const offset = Math.max(0, timelineTime - placed.start);
  return Math.min(placed.clip.out, placed.clip.in + offset * placed.clip.speed);
}

/**
 * The clips visible at a timeline moment, in draw order (bottom first).
 *
 * Usually one. Two during an overlapping transition, and the second entry is
 * always the incoming clip, which is what the renderer blends on top.
 */
export function clipsAt(layout: TimelineLayout, time: number): PlacedClip[] {
  return layout.placed.filter((p) => time >= p.start && time < p.end);
}

export function overlaysAt(project: Project, time: number): TextOverlay[] {
  return project.overlays.filter((o) => time >= o.start && time < o.end);
}

/* ---------------------------------------------------------------- edits */

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() };
}

export function withClips(project: Project, clips: Clip[]): Project {
  return touch({ ...project, clips });
}

export function updateClip(project: Project, clipId: string, patch: Partial<Clip>): Project {
  return withClips(
    project,
    project.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
  );
}

export function removeClip(project: Project, clipId: string): Project {
  const clips = project.clips.filter((c) => c.id !== clipId);
  // The first clip's transition never runs (there is nothing to come in
  // from), so a clip promoted to first would silently carry a dead setting
  // that reappears the moment anything is put in front of it.
  if (clips[0]) clips[0] = { ...clips[0], transition: { ...clips[0].transition, type: "none" } };
  return withClips(project, clips);
}

export function moveClip(project: Project, clipId: string, direction: -1 | 1): Project {
  const index = project.clips.findIndex((c) => c.id === clipId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= project.clips.length) return project;
  const clips = [...project.clips];
  [clips[index], clips[target]] = [clips[target], clips[index]];
  return withClips(project, clips);
}

export function reorderClips(project: Project, from: number, to: number): Project {
  if (from === to || from < 0 || from >= project.clips.length) return project;
  const clips = [...project.clips];
  const [moved] = clips.splice(from, 1);
  clips.splice(Math.max(0, Math.min(clips.length, to)), 0, moved);
  return withClips(project, clips);
}

export function duplicateClip(project: Project, clipId: string): Project {
  const index = project.clips.findIndex((c) => c.id === clipId);
  if (index < 0) return project;
  const copy: Clip = { ...project.clips[index], id: crypto.randomUUID() };
  const clips = [...project.clips];
  clips.splice(index + 1, 0, copy);
  return withClips(project, clips);
}

/** Smallest slice the UI will let a clip become — below this a block is too
 *  small to grab on the timeline and too short to see. */
export const MIN_CLIP_SECONDS = 0.2;

/**
 * Cuts a clip in two at a timeline moment, keeping both halves' settings.
 *
 * The playhead is a TIMELINE position, so it has to be converted back
 * through speed to find the source frame the user actually pointed at —
 * splitting a 2x clip at 3s means cutting its source at 6s.
 */
export function splitClipAt(project: Project, time: number): Project {
  const layout = timelineLayout(project);
  const placed = clipsAt(layout, time).at(-1);
  if (!placed) return project;

  const cut = sourceTimeFor(placed, time);
  if (cut - placed.clip.in < MIN_CLIP_SECONDS * placed.clip.speed) return project;
  if (placed.clip.out - cut < MIN_CLIP_SECONDS * placed.clip.speed) return project;

  const index = project.clips.findIndex((c) => c.id === placed.clip.id);
  const left: Clip = { ...placed.clip, out: cut };
  const right: Clip = {
    ...placed.clip,
    id: crypto.randomUUID(),
    in: cut,
    // A transition here would blend the clip with itself — the two halves
    // are continuous footage, so the seam has to stay a hard cut.
    transition: { type: "none", duration: placed.clip.transition.duration },
  };

  const clips = [...project.clips];
  clips.splice(index, 1, left, right);
  return withClips(project, clips);
}

export function updateOverlay(
  project: Project,
  overlayId: string,
  patch: Partial<TextOverlay>,
): Project {
  return touch({
    ...project,
    overlays: project.overlays.map((o) => (o.id === overlayId ? { ...o, ...patch } : o)),
  });
}

export function addOverlay(project: Project, overlay: TextOverlay): Project {
  return touch({ ...project, overlays: [...project.overlays, overlay] });
}

export function removeOverlay(project: Project, overlayId: string): Project {
  return touch({ ...project, overlays: project.overlays.filter((o) => o.id !== overlayId) });
}

export function patchProject(project: Project, patch: Partial<Project>): Project {
  return touch({ ...project, ...patch });
}

/** mm:ss.d — long enough to place a trim handle, short enough for a chip. */
export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

/**
 * A rough size for the finished file, from the chosen bitrate and length.
 *
 * Shown before an export starts because the studio refuses anything over
 * MAX_EXPORT_BYTES, and finding that out after a two-minute render is a
 * miserable way to learn it. Bitrate is what the encoder is asked to hit,
 * so this is an estimate and the UI must say so.
 */
export function estimateBytes(durationSeconds: number, bitrate: number): number {
  const audioBitrate = 128_000;
  return Math.round(((bitrate + audioBitrate) * durationSeconds) / 8);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
