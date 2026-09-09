"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

/**
 * Data hooks for the admin panel. Auth lives in use-admin.ts; this file is
 * only the tables and the actions on them.
 *
 * Every mutation here invalidates the whole "admin" key space rather than
 * surgically patching caches. Admin writes are rare, deliberate and often
 * ripple across screens — adjusting credits changes the user row, the ledger,
 * the reconciliation totals and the audit log — so a blanket refetch is both
 * cheaper to reason about and less likely to leave an operator looking at a
 * stale number while acting on it.
 */

async function get<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed");
  }
  return res.json();
}

async function post<T>(path: string, body: unknown, method: "POST" | "PATCH" = "POST"): Promise<T> {
  const res = await apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

function useAdminMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      // Anything prefixed "admin" — see the note above.
      queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("admin"),
      });
    },
  });
}

function qs(params: Record<string, string | number | undefined>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") out.set(k, String(v));
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

// ── Users ────────────────────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  tier: string;
  createdAt: string;
  lastLoginAt: string | null;
  generationCount: number;
  creditBalance: number;
};

export function useAdminUsers(params: { q?: string; tier?: string; limit: number; offset: number }) {
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () =>
      get<{ users: AdminUserRow[]; total: number }>(`/api/admin/users${qs(params)}`),
    retry: false,
  });
}

export type AdminUserDetail = {
  user: AdminUserRow & {
    nickname: string | null;
    avatarUrl: string | null;
    updatedAt: string;
  };
  grants: {
    id: string;
    tier: string;
    monthYear: string;
    amount: number;
    remaining: number;
    source: string;
    expiresAt: string | null;
    createdAt: string;
  }[];
  generations: {
    id: string;
    type: string;
    model: string;
    status: string;
    costCredits: number;
    errorCode: string | null;
    createdAt: string;
    completedAt: string | null;
    isPublic: boolean;
  }[];
  usage: {
    monthYear: string;
    generationsCount: number;
    creditsUsed: number;
    storageUsedBytes: number;
  }[];
  audit: AuditEntry[];
};

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => get<AdminUserDetail>(`/api/admin/users/${id}`),
    retry: false,
  });
}

export function useChangeTier(id: string) {
  return useAdminMutation((vars: { tier: string; reason: string }) =>
    post(`/api/admin/users/${id}/tier`, vars, "PATCH"),
  );
}

export function useAdjustCredits(id: string) {
  return useAdminMutation((vars: { amount: number; reason: string }) =>
    post<{ applied: number; balance: number }>(`/api/admin/users/${id}/credits`, vars),
  );
}

// ── Generations ──────────────────────────────────────────────────────────

export type AdminGenerationRow = {
  id: string;
  userId: string;
  userEmail: string;
  type: string;
  model: string;
  status: string;
  costCredits: number;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  processingTimeSeconds: number | null;
  providerTaskId: string | null;
  isPublic: boolean;
  createdAt: string;
  completedAt: string | null;
};

export function useAdminGenerations(params: {
  status?: string;
  model?: string;
  userId?: string;
  problems?: string;
  limit: number;
  offset: number;
}) {
  return useQuery({
    queryKey: ["admin-generations", params],
    queryFn: () =>
      get<{
        generations: AdminGenerationRow[];
        total: number;
        byStatus: { status: string; count: number }[];
        failuresByModel: { model: string; failed: number; total: number }[];
      }>(`/api/admin/generations${qs(params)}`),
    retry: false,
    // The queue moves on its own — an operator watching it should see that
    // without reaching for reload.
    refetchInterval: 15_000,
  });
}

export function useRetryGeneration() {
  return useAdminMutation((vars: { id: string; reason: string }) =>
    post(`/api/admin/generations/${vars.id}/retry`, { reason: vars.reason }),
  );
}

export function useForceFailGeneration() {
  return useAdminMutation((vars: { id: string; reason: string }) =>
    post<{ refundedCredits: number }>(`/api/admin/generations/${vars.id}/fail`, {
      reason: vars.reason,
    }),
  );
}

// ── Content ──────────────────────────────────────────────────────────────

export type AdminContentItem = {
  id: string;
  userId: string;
  userEmail: string;
  nickname: string | null;
  shareAsNickname: boolean;
  type: string;
  model: string;
  prompt: string;
  resultUrl: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  createdAt: string;
};

export function useAdminContent(params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: ["admin-content", params],
    queryFn: () => get<{ items: AdminContentItem[]; total: number }>(`/api/admin/content${qs(params)}`),
    retry: false,
  });
}

export function useUnpublish() {
  return useAdminMutation((vars: { id: string; reason: string }) =>
    post(`/api/admin/content/${vars.id}/unpublish`, { reason: vars.reason }),
  );
}

// ── Support ──────────────────────────────────────────────────────────────

export type AdminMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export function useAdminSupport(params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: ["admin-support", params],
    queryFn: () =>
      get<{ messages: AdminMessage[]; total: number; unread: number }>(
        `/api/admin/support${qs(params)}`,
      ),
    retry: false,
  });
}

export function useMarkMessageRead() {
  return useAdminMutation((vars: { id: string; read: boolean }) =>
    post(`/api/admin/support/${vars.id}/read`, { read: vars.read }),
  );
}

// ── Credits ledger ───────────────────────────────────────────────────────

export type AdminGrant = {
  id: string;
  userId: string;
  userEmail: string;
  tier: string;
  monthYear: string;
  amount: number;
  remaining: number;
  source: string;
  expiresAt: string | null;
  createdAt: string;
};

export function useAdminCredits(params: { source?: string; limit: number; offset: number }) {
  return useQuery({
    queryKey: ["admin-credits", params],
    queryFn: () =>
      get<{
        grants: AdminGrant[];
        total: number;
        bySource: { source: string; grants: number; amount: number; remaining: number }[];
        totals: { granted: number; remaining: number; spent: number; drift: number };
      }>(`/api/admin/credits${qs(params)}`),
    retry: false,
  });
}

// ── Audit ────────────────────────────────────────────────────────────────

export type AuditEntry = {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export function useAdminAudit(params: { limit: number; offset: number }) {
  return useQuery({
    queryKey: ["admin-audit", params],
    queryFn: () => get<{ entries: AuditEntry[]; total: number }>(`/api/admin/audit${qs(params)}`),
    retry: false,
  });
}

// ── Presets ──────────────────────────────────────────────────────────────

/** A preset as /api/admin/presets serves it — the recipe included, unlike
 *  the public payload the app itself reads (see src/hooks/use-presets.ts). */
export type AdminPresetRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: string;
  /** As stored: an `r2://<key>` reference for a clip uploaded to the bucket,
   *  or a plain URL/path for one pasted in. This is the value the form edits
   *  and sends back — never previewPlaybackUrl, whose signature expires. */
  previewUrl: string;
  /** The same clip, signed for playback straight from the bucket. Display
   *  only. The public catalogue serves this shape as `previewUrl`, since the
   *  app never edits it. */
  previewPlaybackUrl: string;
  badge: string | null;
  referenceSubject: string;
  prompt: string;
  model: string;
  parameters: Record<string, unknown>;
  styleModel: string | null;
  stylePrompt: string | null;
  styleParameters: Record<string, unknown>;
  requiresImage: boolean;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** Generations attributed to this preset. Zero until the recipe is used —
   *  it counts rows written since the presetId column existed, and cannot be
   *  backfilled for anything made before that. */
  usageCount: number;
};

/** Everything the create/edit form sends. The server re-validates all of it
 *  against the chosen model, so this type is convenience, not enforcement. */
export type AdminPresetInput = {
  slug: string;
  title: string;
  tagline: string;
  category: string;
  previewUrl: string;
  badge: "New" | null;
  referenceSubject: string;
  prompt: string;
  model: string;
  parameters: Record<string, unknown>;
  styleModel: string | null;
  stylePrompt: string | null;
  styleParameters: Record<string, unknown>;
  requiresImage: boolean;
  published: boolean;
  sortOrder: number;
};

export function useAdminPresets(params: {
  q?: string;
  category?: string;
  published?: string;
  limit: number;
  offset: number;
}) {
  return useQuery({
    queryKey: ["admin-presets", params],
    queryFn: () =>
      get<{ presets: AdminPresetRow[]; total: number }>(`/api/admin/presets${qs(params)}`),
    retry: false,
  });
}

export function useCreatePreset() {
  return useAdminMutation<AdminPresetInput, { preset: AdminPresetRow }>((vars) =>
    post("/api/admin/presets", vars),
  );
}

export function useUpdatePreset() {
  return useAdminMutation<{ id: string; patch: Partial<AdminPresetInput> }, { preset: AdminPresetRow }>(
    (vars) => post(`/api/admin/presets/${vars.id}`, vars.patch, "PATCH"),
  );
}

export function useDeletePreset() {
  return useAdminMutation<{ id: string }, { success: boolean }>(async (vars) => {
    const res = await apiFetch(`/api/admin/presets/${vars.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  });
}
