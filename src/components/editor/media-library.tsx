"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Film, Image as ImageIcon, Plus, Search, Wand2 } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SearchInput } from "@/components/ui/search-input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { EDIT_GENERATION_TYPE } from "@/lib/editor/types";
import { cn } from "@/lib/utils";

export type LibraryItem = {
  id: string;
  type: string;
  prompt: string;
  resultUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
};

type Page = { items: LibraryItem[]; nextCursor: string | null; hasMore: boolean };

/**
 * The user's own finished videos, as the raw material for an edit.
 *
 * Only completed video generations appear — a still image has nothing to
 * play and a failed run has nothing at all, and offering either would just
 * be a card that does nothing when clicked. Past exports from this studio
 * show up too, deliberately: cutting a rough assembly and then trimming that
 * down is a normal way to work.
 */
export function MediaLibrary({
  onAdd,
  addingId,
  usedSourceIds,
}: {
  onAdd: (item: LibraryItem) => void;
  /** The clip currently being downloaded and probed, so its card can say so
   *  instead of looking unresponsive for the second or two that takes. */
  addingId: string | null;
  usedSourceIds: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 400);

  const query = useInfiniteQuery({
    queryKey: ["studio-library", debounced],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ status: "completed", limit: "24" });
      if (debounced) params.set("search", debounced);
      if (pageParam) params.set("cursor", pageParam);
      const res = await apiFetch(`/api/generations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load your library");
      return (await res.json()) as Page;
    },
    initialPageParam: "" as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  // Everything finished with a file behind it. Stills are included now that
  // the timeline can hold them — they land as a fixed-length card rather
  // than a playing clip (see IMAGE_CLIP_DEFAULT_DURATION).
  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).filter(
    (item) => Boolean(item.resultUrl),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border-subtle p-3">
        <SearchInput
          placeholder="Search your library…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {query.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size={22} />
          </div>
        ) : items.length === 0 ? (
          <div className="px-2 py-12 text-center">
            <Film className="mx-auto mb-3 size-7 text-text-tertiary" aria-hidden="true" />
            <p className="text-body-sm text-muted">
              {debounced ? "Nothing matches that search." : "You haven't generated anything yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                busy={addingId === item.id}
                used={usedSourceIds.has(item.id)}
                onAdd={() => onAdd(item)}
              />
            ))}
          </div>
        )}

        {query.hasNextPage && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              loading={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryCard({
  item,
  busy,
  used,
  onAdd,
}: {
  item: LibraryItem;
  busy: boolean;
  used: boolean;
  onAdd: () => void;
}) {
  const isEdit = item.type === EDIT_GENERATION_TYPE;
  // Every generation type except a straight text-to-image run produces a
  // playable clip (text-to-video, image-to-video, and a studio export all
  // do) — so "not an image" is the correct default for anything new added
  // to GENERATION_TYPES later, rather than a list of video types that has
  // to be remembered to keep in sync.
  const isImage = item.type === "text-to-image";

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={busy}
      // The prompt used to be the card's only visible text — now that it's
      // shown as an icon instead, it becomes the accessible name so a
      // screen reader still hears what the clip actually is.
      aria-label={item.prompt}
      title={item.prompt}
      className={cn(
        "group relative aspect-[9/16] overflow-hidden rounded-xl border bg-surface-3 text-left transition-colors",
        used ? "border-brand/40" : "border-line hover:border-border-strong",
        busy && "opacity-60",
      )}
    >
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <video
          // Seeking a hair past the start is what actually paints a frame;
          // a paused <video> at 0 with no poster often stays blank, and
          // generated clips frequently open on black anyway.
          src={`${item.resultUrl}#t=0.1`}
          className="size-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}

      <div className="absolute inset-0 flex flex-col justify-between p-2">
        <div className="flex justify-end">
          {isEdit && (
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
              <Wand2 className="size-2.5" aria-hidden="true" /> EDIT
            </span>
          )}
        </div>
        <div className="flex justify-start">
          <span
            className="flex size-5 items-center justify-center rounded-full bg-black/60 text-white/90"
            aria-hidden="true"
          >
            {isImage ? (
              <ImageIcon className="size-3" />
            ) : (
              <Film className="size-3" />
            )}
          </span>
        </div>
      </div>

      <span
        className={cn(
          "absolute top-2 left-2 flex size-6 items-center justify-center rounded-full transition-opacity",
          "bg-brand text-on-brand opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          busy && "opacity-100",
        )}
        aria-hidden="true"
      >
        {busy ? <Spinner size={12} className="text-on-brand" /> : <Plus className="size-3.5" />}
      </span>

      {used && (
        <span className="absolute right-2 bottom-2 rounded-full bg-brand/90 px-1.5 py-0.5 text-[10px] font-semibold text-on-brand">
          In edit
        </span>
      )}
    </button>
  );
}

export function LibraryHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
      <Search className="size-4 text-text-tertiary" aria-hidden="true" />
      <h2 className="text-label font-semibold text-ink">Your library</h2>
      {count > 0 && <span className="text-caption text-muted">{count} in this edit</span>}
    </div>
  );
}
