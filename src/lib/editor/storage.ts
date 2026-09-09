/**
 * Where an unfinished edit lives between visits.
 *
 * Projects are kept in the browser, not on the server, and that is a
 * deliberate scope choice rather than an oversight: a project holds no
 * media, only references to generations the account already owns, so the
 * only thing lost by keeping it local is cross-device continuity. The
 * finished export, which is the artefact that actually matters, goes to the
 * gallery like any other generation.
 *
 * Two stores, because they hold very different things:
 *   - localStorage for project JSON and the brand kit. Small, synchronous,
 *     and easy to inspect.
 *   - IndexedDB for attached audio files. A three-minute track is megabytes
 *     of binary; localStorage's ~5MB string quota is the wrong home for it,
 *     and blowing that quota would take the project list down with it.
 */

import { emptyProject, type Project, type Watermark } from "./types";

const PROJECTS_KEY = "aivio.studio.projects.v1";
const LAST_OPENED_KEY = "aivio.studio.lastProject.v1";
const BRAND_KIT_KEY = "aivio.studio.brandKit.v1";

/** Oldest projects past this are dropped on save. A browser store is not an
 *  archive, and an unbounded list is how a quota error eventually eats
 *  someone's current work. */
const MAX_PROJECTS = 20;

function readProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  } catch {
    // Corrupt or unreadable (private mode, cleared site data). An empty list
    // is always a safe answer — the studio just opens a new project.
    return [];
  }
}

export function listProjects(): Project[] {
  return readProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function loadProject(id: string): Project | null {
  return readProjects().find((p) => p.id === id) ?? null;
}

export function saveProject(project: Project) {
  if (typeof window === "undefined") return;
  const rest = readProjects().filter((p) => p.id !== project.id);
  const next = [project, ...rest]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_PROJECTS);
  try {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
    window.localStorage.setItem(LAST_OPENED_KEY, project.id);
  } catch {
    // Out of quota, or storage disabled. Autosave is a convenience — losing
    // it must never interrupt an edit in progress, so this stays silent and
    // the UI reports save state from its own last-successful timestamp.
  }
}

export function deleteProject(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PROJECTS_KEY,
      JSON.stringify(readProjects().filter((p) => p.id !== id)),
    );
  } catch {
    /* see saveProject */
  }
}

export function lastOpenedProject(): Project | null {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(LAST_OPENED_KEY);
  return id ? loadProject(id) : null;
}

/**
 * Reopens the most recent project, or starts a fresh one.
 *
 * The signed URLs inside a stored project are always dead by the time it is
 * reopened (R2 playback links last hours), so they are blanked here rather
 * than left to fail as a black frame — the studio re-signs every clip
 * against the gallery on load and fills them back in.
 */
export function resumeOrCreate(): Project {
  const stored = lastOpenedProject();
  if (!stored) return emptyProject();
  return {
    ...stored,
    clips: stored.clips.map((clip) => ({ ...clip, sourceUrl: "", posterUrl: null })),
  };
}

/* ------------------------------------------------------------ brand kit */

/**
 * The watermark a creator uses on everything.
 *
 * Kept outside any one project so it only has to be set up once: a new
 * project starts already wearing the user's mark, which is the difference
 * between a watermark feature people use and one they configure once and
 * forget. Stored settings are applied but left DISABLED — putting a logo on
 * a video is a decision, not a default.
 */
export function loadBrandKit(): Watermark | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BRAND_KIT_KEY);
    return raw ? (JSON.parse(raw) as Watermark) : null;
  } catch {
    return null;
  }
}

export function saveBrandKit(watermark: Watermark) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BRAND_KIT_KEY, JSON.stringify(watermark));
  } catch {
    /* see saveProject */
  }
}

/* ---------------------------------------------------------- audio assets */

const DB_NAME = "aivio-studio";
const DB_VERSION = 1;
const STORE = "assets";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
  });
}

export async function putAsset(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save that file."));
  });
  db.close();
}

export async function getAsset(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read that file."));
  });
  db.close();
  return blob;
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    // A leaked blob is harmless; failing the delete must not fail the edit.
    tx.onerror = () => resolve();
  });
  db.close();
}
