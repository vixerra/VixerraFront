"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import type { GalleryItem } from "@/components/gallery/generation-card";
import { apiFetch } from "@/lib/api-client";
import { useMe } from "@/hooks/use-me";

type CollectionDetail = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  shareToken: string;
  items: GalleryItem[];
};

export function CollectionDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: collection, isLoading, isError, error } = useQuery({
    queryKey: ["collection", id],
    queryFn: async (): Promise<CollectionDetail> => {
      const res = await apiFetch(`/api/collections/${id}`);
      if (res.status === 404) throw new Error("not-found");
      if (!res.ok) throw new Error("Failed to load collection");
      return res.json();
    },
  });

  const [deleting, setDeleting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["collection", id] });
  }

  async function save(partial: Partial<{ name: string; isPublic: boolean }>) {
    try {
      const res = await apiFetch(`/api/collections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) throw new Error("Failed to save");
      invalidate();
    } catch {
      toast({ title: "Couldn't save changes", variant: "error" });
    }
  }

  async function removeItem(generationId: string) {
    await apiFetch(`/api/collections/${id}/items/${generationId}`, { method: "DELETE" });
    invalidate();
  }

  async function deleteCollection() {
    setDeleting(true);
    try {
      await apiFetch(`/api/collections/${id}`, { method: "DELETE" });
      router.push("/collections");
    } catch {
      toast({ title: "Couldn't delete collection", variant: "error" });
      setDeleting(false);
    }
  }

  if (isLoading || !collection) {
    if (isError && error instanceof Error && error.message === "not-found") {
      return (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="text-body text-ink-soft">Collection not found</p>
          <p className="text-body-sm text-muted">
            It may have been deleted, or you don&apos;t have access to it.
          </p>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <CollectionEditor
      collection={collection}
      onSave={save}
      onRemoveItem={removeItem}
      onDelete={deleteCollection}
      deleting={deleting}
    />
  );
}

// Split out from the parent so its editable name/isPublic state can be
// seeded directly from `collection` via useState's lazy initializer —
// this component only ever mounts once `collection` is already loaded (see
// the early return above), so there's no "seed once it arrives" effect
// needed the way there would be if this lived in the parent alongside its
// loading state.
function CollectionEditor({
  collection,
  onSave,
  onRemoveItem,
  onDelete,
  deleting,
}: {
  collection: CollectionDetail;
  onSave: (partial: Partial<{ name: string; isPublic: boolean }>) => Promise<void>;
  onRemoveItem: (generationId: string) => Promise<void>;
  onDelete: () => Promise<void>;
  deleting: boolean;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { data: me } = useMe();
  const [name, setName] = useState(collection.name);
  const [isPublic, setIsPublic] = useState(collection.isPublic);
  const [saving, setSaving] = useState(false);

  async function handleSave(partial: Partial<{ name: string; isPublic: boolean }>) {
    setSaving(true);
    await onSave(partial);
    setSaving(false);
  }

  async function handleVisibility(checked: boolean) {
    const ok = await confirm(
      checked
        ? {
            title: "Publish this collection?",
            description:
              "Anyone with the share link will be able to view every generation in it, including private ones.",
            confirmLabel: "Publish",
          }
        : {
            title: "Turn off the share link?",
            description:
              "The existing link stops working immediately, for everyone you've already sent it to.",
            confirmLabel: "Turn off",
          },
    );
    if (!ok) return;
    setIsPublic(checked);
    await handleSave({ isPublic: checked });
  }

  async function handleRemoveItem(generationId: string) {
    const ok = await confirm({
      title: "Remove from this collection?",
      description: "The generation itself stays in your gallery — only this collection changes.",
      confirmLabel: "Remove",
    });
    if (ok) await onRemoveItem(generationId);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete this collection?",
      description:
        "Generations inside it won't be deleted — only the collection itself. This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) await onDelete();
  }

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/c/${collection.shareToken}` : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== collection.name && handleSave({ name })}
            className="w-full rounded-lg bg-transparent text-heading font-bold tracking-tight text-ink outline-none focus:bg-white/5"
          />
          {collection.description && (
            <p className="mt-2 text-body-sm text-muted">{collection.description}</p>
          )}
        </div>
        <Button variant="secondary" loading={deleting} onClick={handleDelete}>
          <Trash2 className="size-4" /> Delete
        </Button>
      </div>

      <Card
        variant="compact"
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Switch
            checked={isPublic}
            onCheckedChange={handleVisibility}
            disabled={saving}
          />
          <div>
            <p className="text-label text-ink-soft">Public share link</p>
            <p className="text-caption text-muted">Anyone with the link can view this collection.</p>
          </div>
        </div>
        {isPublic && (
          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl} className="sm:w-72" />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast({ title: "Link copied", variant: "success" });
              }}
              aria-label="Copy link"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        )}
      </Card>

      {collection.items.length === 0 ? (
        <p className="py-16 text-center text-body-sm text-muted">
          No items in this collection yet. Add some from your gallery.
        </p>
      ) : (
        <GalleryGrid
          items={collection.items}
          author={me ? { name: me.name, avatarUrl: me.avatarUrl } : undefined}
          viewerIsOwner
          onRemoveFromCollection={handleRemoveItem}
        />
      )}
    </div>
  );
}
