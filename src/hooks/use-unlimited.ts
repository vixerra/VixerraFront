"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";
import { useWorkspace } from "@/components/providers/workspace-provider";

/** GET /api/subscription/unlimited — the 7-day Wan 3.0 Unlimited window of
 *  whoever pays in this workspace (aiVideo-backend's lib/unlimited.ts). */
export type UnlimitedState = {
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  model: string;
  /** The image model Studio annual also gets unlimited, else null. */
  image_model: string | null;
  max_resolution: string | null;
  max_duration_seconds: number | null;
  max_concurrent: number | null;
  queue: {
    waiting: number;
    position: number;
    estimatedWaitSeconds: number;
    paused: boolean;
  } | null;
  /** Worked out when the answer arrives rather than during render: seconds
   *  until the window closes (negative once it has). */
  secondsLeft: number | null;
};

/**
 * The account's Unlimited window, or null when it never had one. Keyed on
 * the workspace like the balance: a Studio team member generating in the
 * team uses the owner's window.
 */
export function useUnlimited() {
  const { data: me } = useMe();
  const workspace = useWorkspace(Boolean(me?.organization));
  return useQuery({
    queryKey: ["unlimited", workspace],
    enabled: Boolean(me),
    queryFn: async (): Promise<UnlimitedState | null> => {
      const res = await apiFetch(`/api/subscription/unlimited?workspace=${workspace}`);
      // An API deployed before the promotion answers 404: no window.
      if (!res.ok) return null;
      const json = (await res.json()) as { unlimited: Omit<UnlimitedState, "secondsLeft"> | null };
      if (!json.unlimited) return null;
      const endsAt = json.unlimited.ends_at ? new Date(json.unlimited.ends_at).getTime() : null;
      return {
        ...json.unlimited,
        secondsLeft: endsAt === null ? null : Math.round((endsAt - Date.now()) / 1000),
      };
    },
    staleTime: 15_000,
    // The queue estimate moves; keep it honest while the composer is open.
    refetchInterval: (query) => (query.state.data?.active ? 30_000 : false),
  });
}
