"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export type SocialPlatform = "tiktok" | "youtube" | "facebook" | "instagram";

/**
 * How a YouTube upload is presented.
 *
 * There is no API flag for this — YouTube decides what is a Short from the
 * file itself (vertical or square, three minutes or less). What the choice
 * controls is the `#Shorts` hint the server puts in the description, and
 * whether it is applied at all. Mirrored in the API's lib/social/types.ts.
 */
export type YouTubeFormat = "short" | "video";

/** Per-platform presentation choices carried with a post. Closed shape: the
 *  server rejects unknown keys rather than storing a setting nothing reads. */
export type PublishOptions = { youtubeFormat?: YouTubeFormat };

export type PlatformInfo = {
  platform: SocialPlatform;
  label: string;
  /** False when the server holds no credentials for this platform. Those
   *  still render — as the manual-export path, not as a dead button. */
  configured: boolean;
  captionLimit: number;
  accepts: ("video" | "image")[];
  simulated: boolean;
};

export type SocialAccount = {
  id: string;
  platform: SocialPlatform;
  externalId: string;
  displayName: string;
  avatarUrl: string | null;
  /** active | needs_reauth | revoked — a token refresh that failed shows up
   *  here so the UI can ask for a reconnect instead of silently queueing
   *  posts that can only fail. */
  status: string;
  connectedAt: string;
  lastUsedAt: string | null;
};

export type SocialPost = {
  id: string;
  generationId: string;
  platform: SocialPlatform;
  caption: string;
  tags: string[];
  options: PublishOptions | null;
  scheduledFor: string;
  status: "scheduled" | "publishing" | "published" | "failed" | "cancelled";
  attemptCount: number;
  providerUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  createdAt: string;
  accountName: string | null;
  accountAvatarUrl: string | null;
};

async function readError(res: Response, fallback: string) {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(body.error ?? fallback);
}

export function useSocialAccounts() {
  return useQuery({
    queryKey: ["social-accounts"],
    queryFn: async () => {
      const res = await apiFetch("/api/social/accounts");
      if (!res.ok) throw await readError(res, "Failed to load connected accounts");
      return (await res.json()) as {
        platforms: PlatformInfo[];
        accounts: SocialAccount[];
        simulated: boolean;
      };
    },
  });
}

/** Asks the server for the provider's consent URL and sends the browser
 *  there. A full navigation rather than a popup: every one of these
 *  providers refuses to render its consent screen inside an iframe, and
 *  popups get blocked when the click is a tick behind an await. */
export function useConnectSocial() {
  return useMutation({
    mutationFn: async (platform: SocialPlatform) => {
      const res = await apiFetch(`/api/social/connect/${platform}`);
      if (!res.ok) throw await readError(res, "Couldn't start the connection");
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    },
  });
}

export function useDisconnectSocial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/social/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw await readError(res, "Couldn't disconnect that account");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
    },
  });
}

export function useSocialPosts(generationId: string | null) {
  return useQuery({
    queryKey: ["social-posts", generationId],
    enabled: Boolean(generationId),
    queryFn: async () => {
      const res = await apiFetch(`/api/social/posts?generationId=${generationId}`);
      if (!res.ok) throw await readError(res, "Failed to load posts");
      return ((await res.json()) as { posts: SocialPost[] }).posts;
    },
    // A queued post is advanced by a cron tick, not by this request, so the
    // only way the UI learns it went out is by asking again. Polls only
    // while something is actually in flight.
    refetchInterval: (query) => {
      const posts = query.state.data;
      if (!posts) return false;
      return posts.some((p) => p.status === "scheduled" || p.status === "publishing")
        ? 10_000
        : false;
    },
  });
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      generationId: string;
      accountIds: string[];
      caption: string;
      tags: string[];
      scheduledFor?: string;
      options?: PublishOptions;
    }) => {
      const res = await apiFetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw await readError(res, "Couldn't schedule that post");
      return (await res.json()) as { posts: SocialPost[] };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-posts"] }),
  });
}

export function useCancelSocialPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/social/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw await readError(res, "Couldn't cancel that post");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-posts"] }),
  });
}
