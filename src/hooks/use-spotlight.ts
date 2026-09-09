"use client";

/**
 * Backs every "glow that follows the cursor on hover" card (dashboard's
 * credits card, the billing plan card, generate's empty-state canvas).
 * Writes the pointer position into --spot-x/--spot-y as plain inline
 * style properties (not React state) so it stays cheap at mousemove
 * frequency — no re-render per pixel moved. Pair with a blurred solid
 * shape (not a radial-gradient()) positioned from those two variables,
 * same "blur, not gradient()" technique as every other glow in this app
 * (see globals.css) — it just needs a live cursor position instead of a
 * fixed corner.
 *
 * `zoom` corrects for a CSS `zoom:` ancestor (generate-workspace.tsx wraps
 * its hero/canvas column in `[zoom:0.7]`). getBoundingClientRect() and
 * clientX/Y both report real, already-zoomed screen pixels, but a `left`/
 * `top` value set on an element *inside* that zoomed context gets shrunk by
 * the zoom factor again at render time — so the raw pixel delta lands short
 * of the actual cursor. Dividing by zoom pre-inflates it to compensate, the
 * same correction this file already applies to the composer bar's padding
 * via `/ HERO_ZOOM`. Pass the same zoom factor here; omit it (defaults to 1)
 * outside any zoomed ancestor.
 */
export function useSpotlight<T extends HTMLElement>(zoom = 1) {
  return {
    onMouseMove: (e: React.MouseEvent<T>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--spot-x", `${(e.clientX - rect.left) / zoom}px`);
      e.currentTarget.style.setProperty("--spot-y", `${(e.clientY - rect.top) / zoom}px`);
    },
  };
}
