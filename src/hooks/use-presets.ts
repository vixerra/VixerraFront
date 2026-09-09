"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Preset } from "@/lib/viral-presets";

/**
 * The published preset catalogue, read from the backend's "Preset" table.
 *
 * It used to be a module constant compiled into the bundle, which is why
 * /presets/[slug] was statically generated — that's gone, since an operator
 * can now add a recipe from the admin panel and it has to appear without a
 * deploy.
 *
 * `staleTime` is generous on purpose. The catalogue changes when a human
 * edits it, not on its own, so refetching it on every focus would be pure
 * noise; an operator's own save invalidates the admin key space and a user
 * picks the change up on their next navigation.
 */

const CATALOGUE_STALE_MS = 5 * 60 * 1000;

async function getJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json as T;
}

export function usePresets() {
  return useQuery({
    queryKey: ["presets"],
    queryFn: async () => (await getJson<{ presets: Preset[] }>("/api/presets")).presets,
    staleTime: CATALOGUE_STALE_MS,
  });
}

export function usePreset(slug: string) {
  return useQuery({
    queryKey: ["preset", slug],
    queryFn: async () => (await getJson<{ preset: Preset }>(`/api/presets/${slug}`)).preset,
    staleTime: CATALOGUE_STALE_MS,
    // A 404 here means the slug doesn't exist or was unpublished — a retry
    // loop can't change either, and the page needs to reach its not-found
    // state promptly rather than after three failed attempts.
    retry: false,
  });
}
