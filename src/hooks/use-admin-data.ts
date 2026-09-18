"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
 *
 * The list queries keep the previous page on screen while the next one loads
 * (placeholderData). Filtering is typed and clicked in quick succession, and
 * swapping the table for a spinner on every keystroke made the page jump.
 *
 * Fields marked optional in the response types are newer than the rest of
 * the API: a backend that hasn't been redeployed answers without them, and
 * the pages fall back rather than break.
 */

type Params = Record<string, string | number | undefined>;

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

function isAdminKey(key: readonly unknown[]) {
  return typeof key[0] === "string" && key[0].startsWith("admin");
}

function useAdminMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      // Anything prefixed "admin" — see the note above.
      queryClient.invalidateQueries({ predicate: (q) => isAdminKey(q.queryKey) });
    },
  });
}

function qs(params: Params) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") out.set(k, String(v));
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

/**
 * Walks every page of a list endpoint, for CSV export of "everything that
 * matches" rather than just the visible page. Sequential and capped: an
 * export is for a spreadsheet, not a backup, and a runaway loop against the
 * API is worse than a truncated file (the caller is told when it is).
 */
export async function fetchAllRows<TRes, TRow>(
  path: string,
  params: Params,
  pick: (res: TRes) => { rows: TRow[]; total: number },
  { pageSize = 100, max = 5000 }: { pageSize?: number; max?: number } = {},
): Promise<{ rows: TRow[]; truncated: boolean }> {
  const rows: TRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const res = await get<TRes>(`${path}${qs({ ...params, limit: pageSize, offset })}`);
    const page = pick(res);
    rows.push(...page.rows);
    if (page.rows.length === 0 || offset + pageSize >= page.total) {
      return { rows, truncated: false };
    }
    if (rows.length >= max) return { rows: rows.slice(0, max), truncated: true };
  }
}

// ── Users ────────────────────────────────────────────────────────────────

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  nickname?: string | null;
  tier: string;
  createdAt: string;
  lastLoginAt: string | null;
  /** Null until the signup link is clicked (or Google/password reset). */
  emailVerifiedAt?: string | null;
  generationCount: number;
  creditBalance: number;
};

export type AdminUsersParams = {
  q?: string;
  /** A tier, or "paid" for every tier but free. */
  tier?: string;
  verified?: string;
  joined?: string;
  active?: string;
  sort?: string;
  dir?: string;
  limit: number;
  offset: number;
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  total: number;
  tierCounts?: { tier: string; count: number }[];
};

export function useAdminUsers(params: AdminUsersParams, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: () => get<AdminUsersResponse>(`/api/admin/users${qs(params)}`),
    retry: false,
    enabled,
    placeholderData: keepPreviousData,
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

export type AdminGenerationsParams = {
  status?: string;
  model?: string;
  userId?: string;
  problems?: string;
  q?: string;
  type?: string;
  range?: string;
  sort?: string;
  dir?: string;
  limit: number;
  offset: number;
};

export type AdminGenerationsResponse = {
  generations: AdminGenerationRow[];
  total: number;
  byStatus: { status: string; count: number }[];
  models?: { model: string; count: number }[];
  failuresByModel: { model: string; failed: number; total: number }[];
};

export function useAdminGenerations(
  params: AdminGenerationsParams,
  { live = true, enabled = true }: { live?: boolean; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["admin-generations", params],
    queryFn: () => get<AdminGenerationsResponse>(`/api/admin/generations${qs(params)}`),
    retry: false,
    enabled,
    placeholderData: keepPreviousData,
    // The queue moves on its own — an operator watching it should see that
    // without reaching for reload. Pausable, because a table that reorders
    // itself under the cursor is hard to work through row by row.
    refetchInterval: live ? 15_000 : false,
  });
}

/** One generation in full — what the detail drawer shows. */
export type AdminGenerationDetail = AdminGenerationRow & {
  userName: string;
  userTier: string;
  prompt: string;
  negativePrompt: string | null;
  seed: number | null;
  progressPercent: number;
  /** Signed for display; expire after a while like every playback URL. */
  resultUrl: string | null;
  thumbnailUrl: string | null;
  inputImageUrl: string | null;
  styledImageUrl: string | null;
  inputAudioUrl: string | null;
  inputVideoUrl: string | null;
  parameters: Record<string, unknown>;
  metadata: Record<string, unknown>;
  presetId: string | null;
  presetTitle: string | null;
  presetSlug: string | null;
  organizationId: string | null;
  organizationName: string | null;
  shareAsNickname: boolean;
  viewCount: number;
  updatedAt: string;
};

export function useAdminGeneration(id: string | null) {
  return useQuery({
    queryKey: ["admin-generation", id],
    queryFn: () => get<{ generation: AdminGenerationDetail }>(`/api/admin/generations/${id}`),
    enabled: Boolean(id),
    retry: false,
    // Signed media URLs in the payload expire; don't serve a stale copy
    // from cache for longer than a glance.
    staleTime: 30_000,
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

/**
 * Retry or fail several jobs under one stated reason.
 *
 * Deliberately a loop over the single-row endpoints rather than a bulk
 * route: each job still gets its own audit entry and goes through exactly
 * the checks a single click would. Sequential, so a batch never hammers the
 * refund path in parallel, and one bad row doesn't sink the rest — failures
 * are collected and reported. The cache is refreshed once, at the end.
 */
export function useBulkGenerationAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { action: "retry" | "fail"; ids: string[]; reason: string }) => {
      const failures: { id: string; error: string }[] = [];
      let done = 0;
      for (const id of vars.ids) {
        try {
          await post(`/api/admin/generations/${id}/${vars.action}`, { reason: vars.reason });
          done += 1;
        } catch (err) {
          failures.push({ id, error: (err as Error).message });
        }
      }
      return { done, failures };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ predicate: (q) => isAdminKey(q.queryKey) });
    },
  });
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

export type AdminContentParams = {
  q?: string;
  kind?: string;
  range?: string;
  sort?: string;
  limit: number;
  offset: number;
};

export function useAdminContent(params: AdminContentParams) {
  return useQuery({
    queryKey: ["admin-content", params],
    queryFn: () => get<{ items: AdminContentItem[]; total: number }>(`/api/admin/content${qs(params)}`),
    retry: false,
    placeholderData: keepPreviousData,
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
  /** The sender's account, when their address has one. */
  userId?: string | null;
  userTier?: string | null;
};

export type AdminSupportParams = {
  status?: string;
  q?: string;
  sort?: string;
  limit: number;
  offset: number;
};

export function useAdminSupport(params: AdminSupportParams) {
  return useQuery({
    queryKey: ["admin-support", params],
    queryFn: () =>
      get<{
        messages: AdminMessage[];
        total: number;
        unread: number;
        counts?: { all: number; unread: number; read: number };
      }>(`/api/admin/support${qs(params)}`),
    retry: false,
    placeholderData: keepPreviousData,
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

export type AdminCreditsParams = {
  source?: string;
  q?: string;
  userId?: string;
  state?: string;
  sort?: string;
  dir?: string;
  limit: number;
  offset: number;
};

export type AdminCreditsResponse = {
  grants: AdminGrant[];
  total: number;
  bySource: { source: string; grants: number; amount: number; remaining: number }[];
  totals: { granted: number; remaining: number; spent: number; drift: number };
};

export function useAdminCredits(params: AdminCreditsParams) {
  return useQuery({
    queryKey: ["admin-credits", params],
    queryFn: () => get<AdminCreditsResponse>(`/api/admin/credits${qs(params)}`),
    retry: false,
    placeholderData: keepPreviousData,
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

export type AdminAuditParams = {
  targetType?: string;
  targetId?: string;
  action?: string;
  adminId?: string;
  q?: string;
  range?: string;
  limit: number;
  offset: number;
};

export type AdminAuditResponse = {
  entries: AuditEntry[];
  total: number;
  facets?: {
    actions: { action: string; count: number }[];
    admins: { adminId: string; adminEmail: string; count: number }[];
    targetTypes: { targetType: string; count: number }[];
  };
};

export function useAdminAudit(params: AdminAuditParams) {
  return useQuery({
    queryKey: ["admin-audit", params],
    queryFn: () => get<AdminAuditResponse>(`/api/admin/audit${qs(params)}`),
    retry: false,
    placeholderData: keepPreviousData,
  });
}

// ── Sidebar badges ───────────────────────────────────────────────────────

export type AdminBadges = { unreadMessages: number; failed24h: number; inFlight: number };

/** The counts behind the nav badges. Polled once a minute from the shell;
 *  an older backend without the endpoint just means no badges. */
export function useAdminBadges() {
  return useQuery({
    queryKey: ["admin-badges"],
    queryFn: () => get<AdminBadges>("/api/admin/badges"),
    retry: false,
    refetchInterval: 60_000,
    staleTime: 30_000,
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
  sort?: string;
  dir?: string;
  limit: number;
  offset: number;
}) {
  return useQuery({
    queryKey: ["admin-presets", params],
    queryFn: () =>
      get<{ presets: AdminPresetRow[]; total: number }>(`/api/admin/presets${qs(params)}`),
    retry: false,
    placeholderData: keepPreviousData,
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
