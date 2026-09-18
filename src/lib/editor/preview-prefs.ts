/**
 * What the preview sounds like, remembered between visits.
 *
 * This is the user's setting, not the document's: it belongs to the person
 * and their room, so it is deliberately kept out of the Project (where it
 * would travel with a shared edit) and out of the undo stack.
 *
 * It is a store rather than a piece of component state because it can only
 * be read in the browser. A value read during render would disagree with the
 * server-rendered markup and break hydration; a value read in an effect
 * would mean a setState during mount. `useSyncExternalStore` is the shape
 * React provides for exactly this — a server snapshot of the defaults, a
 * client snapshot of what is stored, and one re-render to get from one to
 * the other.
 */

export type PreviewPrefs = {
  /** 0..1.5 — above 1 is a real boost, for quiet model output. */
  volume: number;
  muted: boolean;
};

const KEY = "aivio.studio.previewVolume.v1";

/** Full volume, unmuted: someone opening the studio for the first time
 *  should hear their edit. */
const DEFAULTS: PreviewPrefs = { volume: 1, muted: false };

const listeners = new Set<() => void>();

/** getSnapshot must return a stable reference or React re-renders forever,
 *  so the parsed value is cached until something writes. */
let cached: PreviewPrefs | null = null;

function read(): PreviewPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PreviewPrefs>;
    return {
      volume:
        typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
          ? Math.max(0, Math.min(1.5, parsed.volume))
          : DEFAULTS.volume,
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULTS.muted,
    };
  } catch {
    // Private mode, cleared site data, or something else's key. Defaults are
    // always a safe answer.
    return DEFAULTS;
  }
}

export function subscribePreviewPrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPreviewPrefs(): PreviewPrefs {
  if (!cached) cached = read();
  return cached;
}

/** The server has no storage to read, so it renders the defaults — and the
 *  client corrects it on its first commit. */
export function getServerPreviewPrefs(): PreviewPrefs {
  return DEFAULTS;
}

export function setPreviewPrefs(next: PreviewPrefs) {
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Unwritable storage costs the user the memory of this setting, never
    // the setting itself — `cached` still carries it for this session.
  }
  for (const listener of listeners) listener();
}
