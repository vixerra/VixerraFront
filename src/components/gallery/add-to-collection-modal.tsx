"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

type Collection = { id: string; name: string; itemCount: number };

export function AddToCollectionModal({
  generationId,
  onClose,
}: {
  generationId: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  // Scoped sub-key, NOT the bare ["collections"] key collections-client.tsx's
  // useCollections() also uses — that hook's queryFn unwraps the response to
  // a plain array (`return data.items`), while this one caches the raw
  // `{items: [...]}` object. Same key + different cached shapes meant
  // visiting /collections while this modal (always mounted on the gallery
  // page, whether open or not) was subscribed to ["collections"] would hand
  // it back an array with no `.items`, throwing on the very next render —
  // reproducible without ever opening the modal. invalidateQueries(["collections"])
  // below still invalidates this too: TanStack Query matches by key prefix.
  const collectionsQuery = useQuery({
    queryKey: ["collections", "picker"],
    queryFn: async (): Promise<{ items: Collection[] }> => {
      const res = await apiFetch("/api/collections");
      if (!res.ok) throw new Error("Failed to load collections");
      return res.json();
    },
    enabled: Boolean(generationId),
  });

  const addMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const res = await apiFetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationIds: [generationId] }),
      });
      if (!res.ok) throw new Error("Failed to add to collection");
    },
    onSuccess: () => {
      toast({ title: "Added to collection", variant: "success" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Couldn't add", description: err.message, variant: "error" }),
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create collection");
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      setNewName("");
      addMutation.mutate(created.id);
    },
  });

  return (
    <Modal open={Boolean(generationId)} onOpenChange={(open) => !open && onClose()} title="Add to collection">
      <div className="space-y-2">
        {collectionsQuery.data?.items?.length === 0 && (
          <p className="text-body-sm text-muted">You don&apos;t have any collections yet.</p>
        )}
        {collectionsQuery.data?.items?.map((collection) => (
          <button
            key={collection.id}
            type="button"
            onClick={() => addMutation.mutate(collection.id)}
            disabled={addMutation.isPending}
            className="flex w-full items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3 text-left transition-colors hover:border-brand disabled:opacity-50"
          >
            <span className="flex items-center gap-2 text-label text-ink-soft">
              <FolderPlus className="size-4 text-muted" aria-hidden="true" />
              {collection.name}
            </span>
            <span className="text-caption text-muted">{collection.itemCount}</span>
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) createMutation.mutate(newName.trim());
        }}
        className="mt-4 flex gap-2 border-t border-line pt-4"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name"
        />
        <Button type="submit" variant="secondary" loading={createMutation.isPending}>
          <Plus className="size-4" />
        </Button>
      </form>
    </Modal>
  );
}
