"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

/**
 * Admin identity, kept entirely separate from useMe().
 *
 * These hit /api/admin/* and read the `admin_session` cookie, which the app's
 * own login never sets. The identity behind it is a row in the backend's
 * "Admin" table, not a flagged "User" — so being signed in as a customer says
 * nothing about whether you are signed in as staff, even with the same email.
 * The caches are keyed apart ("admin-me" vs "me") so neither query can
 * satisfy the other.
 */

/** Permissions per role are not defined yet — the backend currently lets any
 *  enabled admin through. Carried here so the panel can start shaping around
 *  them; don't gate anything on it until the semantics are settled. */
export type AdminRole = "admin" | "moderator" | "editor";

export type Admin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export function useAdminMe() {
  return useQuery({
    queryKey: ["admin-me"],
    queryFn: async (): Promise<Admin> => {
      const res = await apiFetch("/api/admin/me");
      if (!res.ok) throw new Error("Not authenticated");
      const data = await res.json();
      return data.admin;
    },
    // An admin panel should notice a revoked session quickly rather than
    // running on a stale cache until something happens to refetch.
    staleTime: 30_000,
    retry: false,
  });
}

export function useAdminLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/admin/logout", { method: "POST" });
      if (!res.ok) throw new Error("Failed to log out");
    },
    onSuccess: () => {
      // Only the admin-scoped cache is dropped. Clearing everything (the way
      // the app's logout does) would also blow away the operator's own user
      // session data, which this action has no business touching.
      queryClient.removeQueries({ queryKey: ["admin-me"] });
      queryClient.removeQueries({ queryKey: ["admin-stats"] });
      router.push("/admin/login");
      router.refresh();
    },
  });
}

export type AdminStats = {
  totalUsers: number;
  newUsers7d: number;
  paidUsers: number;
  totalGenerations: number;
  generations24h: number;
  failed24h: number;
  inFlight: number;
  creditsSpent30d: number;
  unreadMessages: number;
  /** 30-day daily spines built server-side with generate_series, so quiet
   *  days come back as 0 rather than being absent from the chart. */
  generationSeries: { date: string; count: number; failed: number }[];
  signupSeries: { date: string; count: number }[];
  creditSeries: { date: string; count: number }[];
  tierSplit: { tier: string; count: number }[];
  byStatus: { status: string; count: number }[];
};

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const res = await apiFetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const stats = (await res.json()) as AdminStats;
      // The series arrays are newer than the counters, so a backend that
      // hasn't been deployed yet answers without them. Default them to empty
      // rather than letting the first `.reduce` take down the whole panel.
      return {
        ...stats,
        generationSeries: stats.generationSeries ?? [],
        signupSeries: stats.signupSeries ?? [],
        creditSeries: stats.creditSeries ?? [],
        tierSplit: stats.tierSplit ?? [],
        byStatus: stats.byStatus ?? [],
      };
    },
    retry: false,
  });
}
