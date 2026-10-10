"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, CloudUpload, Film, ListFilter, Play, Trash2, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { DropdownContent, DropdownItem, DropdownRoot, DropdownTrigger } from "@/components/ui/dropdown";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { useRemoveLibraryVideo, useVideoLibrary } from "@/hooks/use-video-library";
import { usePresets } from "@/hooks/use-presets";
import { useMe } from "@/hooks/use-me";
import { apiFetch } from "@/lib/api-client";
import { formatMediaDuration } from "@/lib/media-duration";
import { presetDurationSeconds } from "@/lib/viral-presets";
import type { LibraryVideo } from "@/lib/video-library";
import { cn } from "@/lib/utils";

/** What the user picked: a file off their disk, a clip already in their
 *  library, or any other playable clip (a generation, a preset preview). */
export type MediaPick =
  | { kind: "file"; file: File }
  | { kind: "upload"; video: LibraryVideo }
  | { kind: "remote"; url: string; name: string };

type Tab = "uploads" | "presets" | "generations" | "liked";
type Sort = "newest" | "oldest" | "longest" | "shortest";

const TABS: { id: Tab; label: string }[] = [
  { id: "uploads", label: "Uploads" },
  { id: "presets", label: "Presets" },
  { id: "generations", label: "Generations" },
  { id: "liked", label: "Liked" },
];

const SORT_LABEL: Record<Sort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  longest: "Longest first",
  shortest: "Shortest first",
};

/** "Recent" shows this many, newest first; "All" shows everything loaded. */
const RECENT_COUNT = 11;

const ACCEPT = "video/mp4,video/quicktime";

type Tile = {
  key: string;
  name: string;
  src: string;
  poster?: string | null;
  seconds?: number;
  /** ms since epoch, for sorting. */
  time: number;
  pick: MediaPick;
  /** Set on the user's own uploads, the only tiles that can be removed. */
  upload?: LibraryVideo;
};

type GenerationItem = {
  id: string;
  type: string;
  prompt: string;
  resultUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
};
type GenerationPage = { items: GenerationItem[]; nextCursor: string | null; hasMore: boolean };

/**
 * The reference-video picker: everything a clip can come from, in one place.
 *
 *   Uploads      the user's video library (GET /upload/library), plus the
 *                tile that takes a new file from disk
 *   Presets      the preset catalogue's preview clips
 *   Generations  the user's own finished videos
 *   Liked        the ones they liked
 *
 * Picking anything closes the picker and hands the choice to the slot, which
 * downloads it and opens the reference editor.
 */
export function MediaPickerModal({
  open,
  onOpenChange,
  onPick,
  minSeconds,
  maxSeconds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (pick: MediaPick) => void;
  minSeconds?: number;
  maxSeconds?: number;
}) {
  const [tab, setTab] = useState<Tab>("uploads");
  const [recent, setRecent] = useState(true);
  const [sort, setSort] = useState<Sort>("newest");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[60] flex h-[min(85vh,760px)] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col",
            "rounded-[28px] border border-line bg-surface-dark p-3 shadow-modal focus:outline-none sm:p-4",
          )}
        >
          <Dialog.Title className="sr-only">Choose a video</Dialog.Title>
          <Dialog.Description className="sr-only">
            Upload a new video or reuse one you already have.
          </Dialog.Description>

          <div className="flex items-center justify-between gap-3 px-1 pb-3 sm:pb-4">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Source">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-body-sm font-semibold transition-colors sm:px-5 sm:py-2.5 sm:text-body",
                    tab === t.id ? "bg-ink text-surface" : "text-text-tertiary hover:text-ink",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-ink transition-colors hover:bg-white/[0.12] sm:size-12"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-white/[0.04]">
            <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-3 sm:px-4">
              <div className="flex items-center gap-1">
                {[true, false].map((isRecent) => (
                  <button
                    key={String(isRecent)}
                    type="button"
                    aria-pressed={recent === isRecent}
                    onClick={() => setRecent(isRecent)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-body-sm font-semibold transition-colors",
                      recent === isRecent
                        ? "border border-line bg-white/[0.06] text-ink"
                        : "border border-transparent text-text-tertiary hover:text-ink",
                    )}
                  >
                    {isRecent ? "Recent" : "All"}
                  </button>
                ))}
              </div>
              <DropdownRoot>
                  <DropdownTrigger className="flex items-center gap-2 rounded-full px-3 py-1.5 text-body-sm font-medium text-text-tertiary transition-colors hover:text-ink sm:text-body">
                    <ListFilter className="size-4 sm:size-5" aria-hidden="true" />
                    {sort === "newest" ? "Sort by" : SORT_LABEL[sort]}
                  </DropdownTrigger>
                  <DropdownContent align="end">
                    {(Object.keys(SORT_LABEL) as Sort[])
                      // Generations carry no length until downloaded.
                      .filter((s) => tab === "uploads" || tab === "presets" || s === "newest" || s === "oldest")
                      .map((s) => (
                        <DropdownItem key={s} onSelect={() => setSort(s)} className="flex items-center justify-between gap-3">
                          {SORT_LABEL[s]}
                          {sort === s && <Check className="size-4" aria-hidden="true" />}
                        </DropdownItem>
                      ))}
                  </DropdownContent>
                </DropdownRoot>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {tab === "uploads" ? (
                <UploadsTab open={open} recent={recent} sort={sort} onPick={onPick} min={minSeconds} max={maxSeconds} />
              ) : tab === "presets" ? (
                <PresetsTab recent={recent} sort={sort} onPick={onPick} min={minSeconds} max={maxSeconds} />
              ) : (
                <GenerationsTab
                  liked={tab === "liked"}
                  recent={recent}
                  sort={sort}
                  onPick={onPick}
                  min={minSeconds}
                  max={maxSeconds}
                />
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type TabProps = {
  recent: boolean;
  sort: Sort;
  onPick: (pick: MediaPick) => void;
  min?: number;
  max?: number;
};

/** "Recent" keeps the newest few, then both views apply the chosen sort. */
function arrange(tiles: Tile[], recent: boolean, sort: Sort): Tile[] {
  const pool = recent ? [...tiles].sort((a, b) => b.time - a.time).slice(0, RECENT_COUNT) : tiles;
  const length = (t: Tile) => t.seconds ?? -1;
  const by: Record<Sort, (a: Tile, b: Tile) => number> = {
    newest: (a, b) => b.time - a.time,
    oldest: (a, b) => a.time - b.time,
    longest: (a, b) => length(b) - length(a),
    shortest: (a, b) => length(a) - length(b),
  };
  return [...pool].sort(by[sort]);
}

function UploadsTab({ open, recent, sort, onPick, min, max }: TabProps & { open: boolean }) {
  const { toast } = useToast();
  const library = useVideoLibrary({ enabled: open });
  const remove = useRemoveLibraryVideo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  // Removing takes a second tap on the same tile: a dialog over this dialog
  // would be one too many for a list that only forgets the clip.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const tiles: Tile[] = (library.data ?? []).map((video) => ({
    key: video.id,
    name: video.name,
    src: video.playbackUrl,
    seconds: video.durationSeconds ?? undefined,
    time: new Date(video.lastUsedAt).getTime(),
    pick: { kind: "upload", video },
    upload: video,
  }));

  function removeVideo(video: LibraryVideo) {
    if (confirmingId !== video.id) {
      setConfirmingId(video.id);
      return;
    }
    setConfirmingId(null);
    remove.mutate(video.id, {
      onError: (err) => toast({ title: "Couldn't remove", description: err.message, variant: "error" }),
    });
  }

  const uploadTile = (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onPick({ kind: "file", file });
      }}
      className={cn(
        "group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed text-ink transition-colors",
        dragOver ? "border-brand bg-brand/10" : "border-white/25 bg-white/[0.02] hover:bg-white/[0.05]",
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-white/[0.1] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] transition-transform group-hover:scale-105 sm:size-20">
        <CloudUpload className="size-7" aria-hidden="true" />
      </span>
      <span className="text-body-sm font-semibold sm:text-body">Upload media</span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick({ kind: "file", file });
        }}
      />
    </button>
  );

  return (
    <Grid
      leading={uploadTile}
      tiles={arrange(tiles, recent, sort)}
      loading={library.isLoading}
      error={library.isError && tiles.length === 0 ? (library.error as Error).message : undefined}
      empty={null}
      onPick={onPick}
      min={min}
      max={max}
      renderAction={(tile) =>
        tile.upload && (
          <button
            type="button"
            onClick={() => removeVideo(tile.upload!)}
            onBlur={() => confirmingId === tile.key && setConfirmingId(null)}
            aria-label={confirmingId === tile.key ? `Confirm removing ${tile.name}` : `Remove ${tile.name}`}
            className={cn(
              "absolute top-2 right-2 flex h-7 items-center justify-center gap-1 rounded-full text-white backdrop-blur-sm transition-opacity",
              confirmingId === tile.key
                ? "bg-red-600 px-2.5 text-caption font-semibold opacity-100"
                : "w-7 bg-black/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
            )}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            {confirmingId === tile.key && "Remove"}
          </button>
        )
      }
    />
  );
}

function PresetsTab({ recent, sort, onPick, min, max }: TabProps) {
  const presets = usePresets();
  const tiles: Tile[] = (presets.data ?? [])
    .filter((p) => Boolean(p.previewUrl))
    .map((p, index) => ({
      key: p.slug,
      name: p.title,
      src: p.previewUrl,
      seconds: p.kind === "replace" ? presetDurationSeconds(p.parameters) : undefined,
      // The catalogue has no dates; its own order stands in for one.
      time: -index,
      pick: { kind: "remote", url: p.previewUrl, name: `${p.slug}.mp4` },
    }));
  return (
    <Grid
      tiles={arrange(tiles, recent, sort)}
      loading={presets.isLoading}
      error={presets.isError ? "Couldn't load the presets." : undefined}
      empty="No presets yet."
      onPick={onPick}
      min={min}
      max={max}
    />
  );
}

function GenerationsTab({ liked, recent, sort, onPick, min, max }: TabProps & { liked: boolean }) {
  const { data: me } = useMe();
  const workspace = useWorkspace(Boolean(me?.organization));
  const query = useInfiniteQuery({
    queryKey: ["reference-picker-generations", workspace, liked],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ status: "completed", limit: "30", workspace });
      if (liked) params.set("liked", "true");
      if (pageParam) params.set("cursor", pageParam);
      const res = await apiFetch(`/api/generations?${params.toString()}`);
      if (!res.ok) throw new Error("Couldn't load your generations.");
      return (await res.json()) as GenerationPage;
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  // Every type but text-to-image is a clip (the editor's library reads it
  // the same way).
  const tiles: Tile[] = (query.data?.pages.flatMap((p) => p.items) ?? [])
    .filter((g) => g.type !== "text-to-image" && g.resultUrl)
    .map((g) => ({
      key: g.id,
      name: g.prompt || "Generation",
      src: g.resultUrl!,
      poster: g.thumbnailUrl,
      time: new Date(g.createdAt).getTime(),
      pick: { kind: "remote", url: g.resultUrl!, name: `generation-${g.id}.mp4` },
    }));

  return (
    <>
      <Grid
        tiles={arrange(tiles, recent, sort)}
        loading={query.isLoading}
        error={query.isError ? (query.error as Error).message : undefined}
        empty={liked ? "Videos you like show up here." : "Your finished videos show up here."}
        onPick={onPick}
        min={min}
        max={max}
      />
      {!recent && query.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="rounded-full bg-white/[0.06] px-5 py-2 text-body-sm font-semibold text-ink hover:bg-white/[0.1] disabled:opacity-50"
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}

function Grid({
  leading,
  tiles,
  loading,
  error,
  empty,
  onPick,
  min,
  max,
  renderAction,
}: {
  leading?: React.ReactNode;
  tiles: Tile[];
  loading: boolean;
  error?: string;
  empty: string | null;
  onPick: (pick: MediaPick) => void;
  min?: number;
  max?: number;
  renderAction?: (tile: Tile) => React.ReactNode;
}) {
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {leading && <li>{leading}</li>}
        {tiles.map((tile) => (
          <li key={tile.key} className="group relative">
            <MediaTile tile={tile} onPick={onPick} min={min} max={max} />
            {renderAction?.(tile)}
          </li>
        ))}
      </ul>
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <p className="py-10 text-center text-body-sm text-muted">{error}</p>
      ) : (
        tiles.length === 0 &&
        empty && (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Film className="size-6 text-text-tertiary" aria-hidden="true" />
            <p className="text-body-sm text-muted">{empty}</p>
          </div>
        )
      )}
    </>
  );
}

function MediaTile({
  tile,
  onPick,
  min,
  max,
}: {
  tile: Tile;
  onPick: (pick: MediaPick) => void;
  min?: number;
  max?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const tooShort = tile.seconds !== undefined && min !== undefined && tile.seconds < min - 0.05;
  const tooLong = tile.seconds !== undefined && max !== undefined && tile.seconds > max + 0.05;

  return (
    <button
      type="button"
      disabled={tooShort}
      onClick={() => onPick(tile.pick)}
      title={tooShort ? `Too short: this slot needs at least ${min}s.` : tile.name}
      aria-label={tile.name}
      onMouseEnter={(e) => {
        const el = e.currentTarget.querySelector("video");
        if (!el) return;
        void el.play().then(() => setPlaying(true), () => undefined);
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget.querySelector("video");
        if (el) {
          el.pause();
          el.currentTime = 0.1;
        }
        setPlaying(false);
      }}
      className={cn(
        "relative block aspect-square w-full overflow-hidden rounded-2xl bg-white/[0.05] ring-brand transition-shadow",
        tooShort ? "cursor-not-allowed opacity-40" : "hover:ring-2",
      )}
    >
      {/* Contained, not cropped: a vertical clip sits in the middle of its
          square the way it will be used, and #t=0.1 paints a frame before
          anything plays without touching the URL's signature. */}
      <video
        src={`${tile.src}#t=0.1`}
        poster={tile.poster ?? undefined}
        className="absolute inset-0 h-full w-full object-contain"
        preload="metadata"
        muted
        loop
        playsInline
      />
      {!playing && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Play className="size-9 fill-white text-white drop-shadow-[0_2px_8px_rgb(0_0_0/0.6)]" aria-hidden="true" />
        </span>
      )}
      {tile.seconds !== undefined && (
        <span
          className={cn(
            "absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-caption font-semibold backdrop-blur-sm",
            tooLong ? "bg-brand text-on-brand" : "bg-black/60 text-white",
          )}
          title={tooLong ? `Longer than ${max}s: you'll trim it next.` : undefined}
        >
          {formatMediaDuration(tile.seconds)}
        </span>
      )}
    </button>
  );
}
