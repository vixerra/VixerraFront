"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Heart } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

// A tile sits still on its first frame and only plays while the pointer is
// on the card — a grid of clips all looping at once is noise, and dozens of
// simultaneous decodes are expensive. Loading still waits for the tile to
// scroll into view, and leaving the viewport pauses playback (scrolling away
// mid-hover) without ever re-fetching.
//
// `#t=0.1` on a source without a thumbnail asks the browser to seek just
// past the start, which is what actually paints a still frame — a plain
// paused <video> with preload="metadata" can stay blank, and clips often
// open on a black frame anyway. Playback resumes from wherever it paused
// rather than rewinding, so re-hovering doesn't restart the clip.
function LazyVideoTile({
  src,
  poster,
  alt,
  playing,
}: {
  src: string;
  poster: string | null;
  alt: string;
  playing: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setHasLoadedOnce(true);
      },
      { rootMargin: "150px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (playing && inView) {
      videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
    }
  }, [playing, inView, hasLoadedOnce]);

  return (
    <div ref={containerRef} className="h-full w-full bg-surface-3">
      {hasLoadedOnce && (
        <video
          ref={videoRef}
          className={cn("h-full w-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
          src={poster ? src : `${src}#t=0.1`}
          poster={poster ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt}
          onLoadedData={() => setLoaded(true)}
        />
      )}
    </div>
  );
}

export type GalleryItem = {
  id: string;
  type: string;
  model: string;
  prompt: string;
  status: string;
  progressPercent: number;
  resultUrl: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  /** Which identity the community gallery credits for this one — chosen at
   *  share time, see ShareIdentityModal. */
  shareAsNickname?: boolean;
  // Likes, from the API (see lib/likes.ts in the backend). Optional for the
  // handful of local call sites that build GalleryItems by hand; an item
  // without them reads as "nobody has liked this", which is the right
  // default for something that doesn't exist server-side yet.
  likeCount?: number;
  likedByMe?: boolean;
  /** Only sent by the public feed and shared collections — the surfaces
   *  where the viewer might not be the creator. */
  author?: { name: string; avatarUrl: string | null } | null;
  /** True when this came out of a preset. A preset's recipe is ours rather
   *  than the viewer's — the studio that runs one shows an upload slot and
   *  nothing else — so the surfaces that would otherwise print its prompt
   *  keep it back (see itemLabel and the preview modal's prompt panel).
   *  Set by the API from the row's presetId. */
  fromPreset?: boolean;
  // Everything below is already on every serialized generation the API
  // returns (see serializeGeneration in the backend) — optional here only
  // because a few local call sites build GalleryItems by hand. The preview
  // modal reads them for its prompt/details panel.
  negativePrompt?: string | null;
  /** The still an image-to-video (or an image edit) started from, signed by
   *  the API into something an <img> can load. Only the creator's own
   *  surfaces get a usable link — see serializeWithSocial in the backend —
   *  so on the public feed this is a reference the browser can't fetch, and
   *  the preview panel leaves it alone. */
  inputImageUrl?: string | null;
  seed?: number | null;
  parameters?: Record<string, unknown> | null;
  costCredits?: number;
  processingTimeSeconds?: number | null;
  errorMessage?: string | null;
  createdAt?: string;
};

/** What to call a generation where the prompt would otherwise be the label:
 *  an aria-label, an alt, the lightbox's screen-reader title. A preset's
 *  prompt is not on show anywhere else, and an alt attribute is still on
 *  show — so those get named after the preset instead. */
export function itemLabel(item: GalleryItem) {
  return item.fromPreset ? "Preset generation" : item.prompt;
}

export function GenerationCard({
  item,
  onOpen,
  onToggleLike,
  showAuthor = false,
}: {
  item: GalleryItem;
  onOpen: () => void;
  onToggleLike?: () => void;
  /** Credits the creator on the tile — the public feed and shared
   *  collections, where the viewer generally isn't the person who made it. */
  showAuthor?: boolean;
}) {
  const isVideo = item.type !== "text-to-image";
  const liked = item.likedByMe ?? false;
  const likeCount = item.likeCount ?? 0;
  // Tracked on the card root, not the video itself: enter/leave don't fire
  // for moves between a node and its descendants, so drifting onto the like
  // button keeps the clip running instead of stuttering it.
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-card transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:border-border-strong hover:shadow-glow-sm"
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 h-full w-full cursor-pointer"
        aria-label={`Open ${itemLabel(item)}`}
      >
        {item.status === "completed" && item.resultUrl ? (
          isVideo ? (
            <LazyVideoTile
              src={item.resultUrl}
              poster={item.thumbnailUrl}
              alt={itemLabel(item)}
              playing={hovered}
            />
          ) : (
            // Plain <img>, not next/image: results are served from R2 behind
            // the Edge Function, and the optimizer fetches them server-side
            // with no session cookie, so every tile came back broken while
            // the same URL loads fine in the browser (which is why the video
            // tiles above and the lightbox's <img> always worked). Same
            // reason the preview modal and avatars skip next/image too.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.resultUrl}
              alt={itemLabel(item)}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          )
        ) : item.status === "failed" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-3 p-4 text-center">
            <AlertCircle className="size-6 text-accent" aria-hidden="true" />
            <span className="text-caption text-muted">Generation failed</span>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-3">
            <Spinner />
            <span className="font-mono text-caption text-muted">{item.progressPercent}%</span>
          </div>
        )}
      </button>

      {/* The only chrome on a tile: everything else (status, prompt, actions)
          now lives in the preview modal. Always visible below sm: — touch
          devices have no hover state, so a hover-only reveal would put the
          heart out of reach. A liked tile keeps its heart on at every size,
          otherwise there's no way to see what you've liked. */}
      {onToggleLike && (
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className={cn(
            "absolute top-2.5 right-2.5 flex h-9 items-center gap-1.5 rounded-full px-2.5",
            "bg-black/40 text-white backdrop-blur-sm transition-[opacity,transform,background-color] duration-200",
            "hover:bg-black/60 active:scale-90",
            // A liked tile, or one carrying a count, keeps its heart on at
            // every size — the count is information, not chrome, and a
            // hover-only reveal would hide it from touch devices entirely.
            liked || likeCount > 0
              ? "opacity-100"
              : "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
          )}
        >
          <Heart className={cn("size-4.5", liked && "fill-brand text-brand")} aria-hidden="true" />
          {likeCount > 0 && (
            <span className="text-caption font-semibold tabular-nums">{likeCount}</span>
          )}
        </button>
      )}

      {/* Byline, bottom-left. Sits under its own scrim rather than over the
        * image directly, so a light result doesn't swallow the name. */}
      {showAuthor && item.author && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/45 px-3 py-2 backdrop-blur-sm">
          {item.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.author.avatarUrl}
              alt=""
              className="size-5 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
              {item.author.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate text-caption font-medium text-white">{item.author.name}</span>
        </div>
      )}

    </div>
  );
}
