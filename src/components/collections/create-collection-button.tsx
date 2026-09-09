"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

export function CreateCollectionButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create collection");
      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
      toast({ title: "Collection created", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't create collection",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New collection
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="New collection">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="collection-name">Name</Label>
            <Input
              id="collection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="collection-description">Description (optional)</Label>
            <Textarea
              id="collection-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" loading={submitting} className="w-full">
            Create
          </Button>
        </form>
      </Modal>
    </>
  );
}
