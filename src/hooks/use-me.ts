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
  createdAt: string;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me> => {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to load user");
      const data = await res.json();
      return data.user;
    },
  });
}
