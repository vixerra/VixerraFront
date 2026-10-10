"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { LibraryVideo } from "@/lib/video-library";

const KEY = ["video-library"] as const;

/** The signed-in user's reference clips, most recently used first
 *  (GET /upload/library). Only fetched while the picker is open. */
export function useVideoLibrary({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: KEY,
    enabled,
    queryFn: async () => {
      const res = await apiFetch("/api/upload/library");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't load your videos.");
      return json.items as LibraryVideo[];
    },
    // Stale at once, so every opening of the picker refetches behind the
    // cached list: a clip uploaded from another form since is there.
    staleTime: 0,
  });
}

/** Takes a clip off the list. The file itself stays: generations made from
 *  it keep pointing at it. */
export function useRemoveLibraryVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/upload/library/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't remove this video.");
    },
    onMutate: (id) => {
      queryClient.setQueryData<LibraryVideo[]>(KEY, (items) => items?.filter((v) => v.id !== id));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Moves a picked clip back to the top of the list. Best effort. */
export function markLibraryVideoUsed(id: string) {
  void apiFetch(`/api/upload/library/${id}/use`, { method: "POST" }).catch(() => undefined);
}
