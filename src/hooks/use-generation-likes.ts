"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import type { GalleryItem } from "@/components/gallery/generation-card";

// Likes are server state now (they used to live in localStorage, private to
// one browser). The count and "did I like this" ride along on every
// generation the API returns, so there is no likes query to keep in sync —
// only the generation caches, patched in place below.

/** Every cache that can hold generations. A like has to show up in all of
 *  them at once: the same tile can be on screen in my gallery, the dashboard's
 *  recent strip and a collection at the same time. */
const GENERATION_QUERY_KEYS = [
  ["generations"],
  ["generations-public"],
  ["dashboard-summary"],
  ["collection"],
  ["public-collection"],
] as const;

type LikeState = { likedByMe: boolean; likeCount: number };

/** Carries the HTTP status so onError can tell "you're signed out" (the one
 *  failure with a useful next step) from anything else. */
class LikeError extends Error {
  constructor(readonly status: number) {
    super(`Like request failed with ${status}`);
  }
}

/**
 * Applies a like to whichever generation-shaped payload this cache holds.
 * Callers store generations in four different shapes and the patch has to
 * walk all of them, because missing one fails silently — the request goes
 * through, the cache keeps the old value, and the heart only catches up on
 * the next refetch:
 *   - a bare `GalleryItem[]`      (public gallery: its queryFn returns data.items)
 *   - an infinite query's `pages` (my gallery)
 *   - `{ items }`                 (collections, shared collections)
 *   - `{ recentGenerations }`     (dashboard)
 */
function patchCachedGenerations(data: unknown, id: string, next: LikeState): unknown {
  if (!data || typeof data !== "object") return data;

  const patchOne = (item: GalleryItem) =>
    item.id === id ? { ...item, ...next } : item;

  // Checked before the object cases: an array is typeof "object" too, so
  // without this it fell through every branch below and returned unchanged.
  if (Array.isArray(data)) return (data as GalleryItem[]).map(patchOne);

  const record = data as Record<string, unknown>;

  if (Array.isArray(record.pages)) {
    return { ...record, pages: record.pages.map((page) => patchCachedGenerations(page, id, next)) };
  }
  if (Array.isArray(record.items)) {
    return { ...record, items: (record.items as GalleryItem[]).map(patchOne) };
  }
  if (Array.isArray(record.recentGenerations)) {
    return {
      ...record,
      recentGenerations: (record.recentGenerations as GalleryItem[]).map(patchOne),
    };
  }
  return data;
}

function patchEverywhere(queryClient: QueryClient, id: string, next: LikeState) {
  for (const key of GENERATION_QUERY_KEYS) {
    queryClient.setQueriesData({ queryKey: key }, (data: unknown) =>
      patchCachedGenerations(data, id, next),
    );
  }
}

/**
 * Toggling a like is optimistic: the heart fills on the click, not on the
 * round trip. The server's own count comes back in the response and replaces
 * the guess, which matters because other people are liking the same public
 * generation while you look at it.
 */
export function useToggleLike() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    // One like at a time, app-wide. Toggling fast otherwise races a PUT
    // against a DELETE on the same row: whichever reply lands last wins the
    // cache, and it isn't necessarily the one that wrote the DB last — the
    // count then disagrees with the heart until a reload.
    scope: { id: "generation-like" },

    mutationFn: async ({ item }: { item: GalleryItem }) => {
      const res = await apiFetch(`/api/generations/${item.id}/like`, {
        method: item.likedByMe ? "DELETE" : "PUT",
      });
      if (!res.ok) throw new LikeError(res.status);
      return (await res.json()) as { liked: boolean; likeCount: number };
    },

    onMutate: ({ item }) => {
      const current = item.likeCount ?? 0;
      // Snapshot every generation cache so a failure can put all of them
      // back — a like touching five caches needs five undos.
      const snapshots = GENERATION_QUERY_KEYS.flatMap((key) =>
        queryClient.getQueriesData({ queryKey: key }),
      );
      patchEverywhere(queryClient, item.id, {
        likedByMe: !item.likedByMe,
        likeCount: Math.max(0, current + (item.likedByMe ? -1 : 1)),
      });
      return { snapshots };
    },

    onError: (error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
      // A like that silently rolls back looks identical to a like that never
      // registered, so every failure says something. 401 is the one worth a
      // specific message: it's the only one the viewer can act on.
      const signedOut = error instanceof LikeError && error.status === 401;
      toast({
        title: signedOut ? "Sign in to like" : "Couldn't save that like",
        description: signedOut
          ? "Likes are saved to your account."
          : "Something went wrong — please try again.",
        variant: signedOut ? "default" : "error",
      });
    },

    onSuccess: (result, { item }) => {
      patchEverywhere(queryClient, item.id, {
        likedByMe: result.liked,
        likeCount: result.likeCount,
      });
    },
  });
}
