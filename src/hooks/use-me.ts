"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export type Me = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** Community pen name. Null until the first time they share anonymously —
   *  it's minted on demand, not at signup. */
  nickname: string | null;
  nicknameAvatarUrl: string | null;
  /** What THIS account pays for. Billing and the plan switcher must use it,
   *  or a team member would be shown a plan they don't own and offered a
   *  downgrade they can't make. */
  tier: string;
  /** What this account can actually DO. For a team member that is the
   *  owner's tier, because the owner's plan is what pays for their
   *  generations. Every capability gate reads this one — see
   *  hasCreatorSuite's callers. Falls back to `tier` for a solo account. */
  effectiveTier: string;
  /** The one team this account is attached to, or null.
   *  `role` is "owner" for the person who pays, or the member's own role:
   *  creator (may generate), editor (may reshape/publish existing team work)
   *  or viewer (read-only). */
  organization: {
    id: string;
    name: string;
    role: "owner" | "creator" | "editor" | "viewer";
  } | null;
  /** When the address was confirmed (signup link, reset link or Google).
   *  Null only for an account that predates the check and was never
   *  backfilled — a session can't otherwise exist for an unverified one. */
  emailVerifiedAt: string | null;
  createdAt: string;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me> => {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) throw Object.assign(new Error("Failed to load user"), { status: res.status });
      const data = await res.json();
      // The proxy's answer when there's no session cookie (src/proxy.ts) —
      // signed out, same as the API's 401, minus the console error.
      if (!data.user) throw Object.assign(new Error("Failed to load user"), { status: 401 });
      return data.user;
    },
    // A 401 just means signed out, and asking again won't change that — the
    // default retry doubled the request (and its console error) for every
    // signed-out visitor.
    retry: (failureCount, error) =>
      (error as Error & { status?: number }).status !== 401 && failureCount < 1,
  });
}
