"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMe } from "@/hooks/use-me";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { GalleryGrid } from "./gallery-grid";
import { AddToCollectionModal } from "./add-to-collection-modal";
import { ShareIdentityModal } from "./share-identity-modal";
import type { GalleryItem } from "./generation-card";
import { GENERATION_TYPES, GENERATION_STATUSES } from "@/lib/constants";
import { EDIT_GENERATION_TYPE } from "@/lib/editor/types";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type GenerationsResponse = { items: GalleryItem[]; nextCursor: string | null; hasMore: boolean };

export function MyGalleryClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  // Liked is a toggle rather than another Select: it's a yes/no view of the
  // same list, and it composes with the type/status/search filters.
  const [likedOnly, setLikedOnly] = useState(false);
  const [collectionTarget, setCollectionTarget] = useState<string | null>(null);
  // The generation waiting on an identity choice — set when someone shares,
  // cleared once they confirm or cancel.
  const [shareTarget, setShareTarget] = useState<GalleryItem | null>(null);
  const debouncedSearch = useDebouncedValue(search, 400);

  // The workspace is part of the filter set, not a separate concern: it
  // decides whose work the list contains, so it has to sit in the query key
  // or switching would show the previous workspace's cached page.
  const workspace = useWorkspace(Boolean(me?.organization));
  const filters = { type, status, search: debouncedSearch, likedOnly, workspace };

  const query = useInfiniteQuery({
    queryKey: ["generations", filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.likedOnly) params.set("liked", "true");
      if (filters.workspace === "team") params.set("workspace", "team");
      if (pageParam) params.set("cursor", pageParam);
      const res = await apiFetch(`/api/generations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load generations");
      return (await res.json()) as GenerationsResponse;
    },
    initialPageParam: "" as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["generations"] });
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/generations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Deleted", variant: "success" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/generations/${id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error("Failed to duplicate");
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Duplicated", description: "Re-running with the same settings.", variant: "success" });
    },
  });

  const togglePublicMutation = useMutation({
    mutationFn: async ({
      id,
      isPublic,
      shareAsNickname,
    }: {
      id: string;
      isPublic: boolean;
      // Omitted when unsharing — taking something down says nothing about
      // whose name it would carry if it went back up.
      shareAsNickname?: boolean;
    }) => {
      const res = await apiFetch(`/api/generations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          shareAsNickname === undefined ? { isPublic } : { isPublic, shareAsNickname },
        ),
      });
      if (!res.ok) throw new Error("Failed to update");
    },
    onSuccess: (_data, variables) => {
      invalidate();
      setShareTarget(null);
      toast({
        title: variables.isPublic ? "Shared to the community" : "Removed from the community",
        variant: "success",
      });
    },
  });

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-64">
          <SearchInput
            placeholder="Search by prompt…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="sm:w-44">
          <option value="">All types</option>
          {GENERATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/-/g, " ")}
            </option>
          ))}
          {/* Appended rather than added to GENERATION_TYPES: that list is the
              set of things the generator can run, and an edit is assembled in
              the studio rather than produced by a model — but it is still a
              row in this gallery, so it needs to be filterable here. */}
          <option value={EDIT_GENERATION_TYPE}>studio edit</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40">
          {/* Not "All statuses": the list endpoint drops failed rows unless
              one is asked for by name, so saying "all" here would be a lie
              about what the default view contains. */}
          <option value="">All except failed</option>
          {GENERATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setLikedOnly((v) => !v)}
          aria-pressed={likedOnly}
          className={cn(
            "flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-label font-medium transition-colors",
            likedOnly
              ? "border-brand bg-brand/10 text-brand"
              : "border-line bg-surface-dark text-muted hover:text-ink-soft",
          )}
        >
          <Heart className={cn("size-4", likedOnly && "fill-brand")} aria-hidden="true" />
          Liked
        </button>
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size={28} />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-body-sm text-muted">
            {likedOnly
              ? "You haven't liked anything yet."
              : "No generations match these filters."}
          </p>
        ) : (
          <>
            <GalleryGrid
              items={items}
              author={me ? { name: me.name, avatarUrl: me.avatarUrl } : undefined}
              viewerIsOwner
              onDelete={async (id) => {
                const ok = await confirm({
                  title: "Delete this generation?",
                  description:
                    "It's removed from your gallery and any collections it's in. The credits it cost aren't returned, and this can't be undone.",
                  confirmLabel: "Delete",
                  tone: "danger",
                });
                // Reported back so the preview panel knows whether to close:
                // a cancelled delete should leave it open on the same item.
                if (!ok) return false;
                deleteMutation.mutate(id);
                return true;
              }}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
              onAddToCollection={(id) => setCollectionTarget(id)}
              onTogglePublic={async (id) => {
                const item = items.find((i) => i.id === id);
                if (!item) return;
                // Going public already asks its own question (whose name it
                // carries), so only the take-down needs one added.
                if (!item.isPublic) {
                  setShareTarget(item);
                  return;
                }
                const ok = await confirm({
                  title: "Remove from the community?",
                  description:
                    "It stops appearing in the public feed and its likes are lost. You can share it again later.",
                  confirmLabel: "Remove",
                });
                if (ok) togglePublicMutation.mutate({ id, isPublic: false });
              }}
            />
            {query.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="secondary"
                  loading={query.isFetchingNextPage}
                  onClick={() => query.fetchNextPage()}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ShareIdentityModal
        // Remount per generation so the pre-selected identity is the one
        // stored on THIS item rather than whatever the last dialog left.
        key={shareTarget?.id ?? "none"}
        open={shareTarget !== null}
        onOpenChange={(open) => !open && setShareTarget(null)}
        defaultAsNickname={shareTarget?.shareAsNickname ?? false}
        pending={togglePublicMutation.isPending}
        onConfirm={(shareAsNickname) => {
          if (shareTarget) {
            togglePublicMutation.mutate({ id: shareTarget.id, isPublic: true, shareAsNickname });
          }
        }}
      />

      <AddToCollectionModal generationId={collectionTarget} onClose={() => setCollectionTarget(null)} />
    </div>
  );
}
