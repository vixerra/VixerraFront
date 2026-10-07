"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { useWorkspace } from "@/components/providers/workspace-provider";
import {
  isActive,
  type Influencer,
  type InfluencerDetail,
  type InfluencerOptions,
} from "@/lib/influencer";

/**
 * The AI influencer API (aiVideo-backend's routes/influencers.ts).
 *
 * The lists poll while something in them is still rendering, rather than
 * opening a progress stream per card: the page already streams the one job
 * it just submitted (useGeneration), and this only has to notice when the
 * others land.
 */

const POLL_WHILE_ACTIVE_MS = 5000;

async function getJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json as T;
}

export function useInfluencerOptions() {
  return useQuery({
    queryKey: ["influencer-options"],
    queryFn: () => getJson<InfluencerOptions>("/api/influencers/options"),
    // A catalogue, changed by a deploy, never by the user.
    staleTime: 30 * 60 * 1000,
  });
}

/** `enabled` lets a surface that only sometimes needs a name (the gallery
 *  preview) skip the fetch for everything else. */
export function useInfluencers({ enabled = true }: { enabled?: boolean } = {}) {
  const { data: me } = useMe();
  const workspace = useWorkspace(Boolean(me?.organization));
  return useQuery({
    queryKey: ["influencers", workspace],
    enabled,
    queryFn: async () =>
      (await getJson<{ items: Influencer[] }>(`/api/influencers?workspace=${workspace}`)).items,
    refetchInterval: (query) =>
      query.state.data?.some((i) => i.portrait && isActive(i.portrait.status)) ? POLL_WHILE_ACTIVE_MS : false,
  });
}

export function useInfluencer(id: string | null) {
  return useQuery({
    queryKey: ["influencer", id],
    queryFn: () => getJson<InfluencerDetail>(`/api/influencers/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.generations.some((g) => isActive(g.status)) ? POLL_WHILE_ACTIVE_MS : false,
  });
}

export function useInvalidateInfluencers() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["influencers"] });
    queryClient.invalidateQueries({ queryKey: ["influencer"] });
    // Carries the per-user "first portrait is free" flag, which the first
    // portrait just spent.
    queryClient.invalidateQueries({ queryKey: ["influencer-options"] });
  }, [queryClient]);
}
