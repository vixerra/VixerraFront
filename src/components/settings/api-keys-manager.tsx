"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";

// The public base URL a key is actually called against — different from
// apiFetch's same-origin "/edge-api" rewrite, which only exists inside
// this Next.js app itself. A third-party client has no such proxy, so it
// needs the Edge Function's real address.
const PUBLIC_API_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/functions/v1/api`;
// The Supabase gateway requires this on every request regardless of the
// API key above (see supabase/functions/api/index.ts's comment) — it's the
// project's public anon/publishable key, already shipped in this app's own
// browser bundle, so showing it here isn't exposing anything new.
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type ApiKeyRow = {
  id: string;
  keyPrefix: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function ApiKeysManager() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const keysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: async (): Promise<{ keys: ApiKeyRow[] }> => {
      const res = await apiFetch("/api/user/api-keys");
      if (!res.ok) throw new Error("Failed to load API keys");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (keyName: string) => {
      const res = await apiFetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create key");
      return json as { key: string };
    },
    onSuccess: (data) => {
      setCreateOpen(false);
      setName("");
      setRevealedKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't create key", description: err.message, variant: "error" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/user/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "Key revoked", variant: "success" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-subheading font-semibold text-ink">API keys</h2>
          <p className="mt-1 text-body-sm text-muted">
            Use these to call the Vixerra API from your own apps.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New key
        </Button>
      </div>

      <Card variant="standard" className="divide-y divide-line p-0">
        {keysQuery.data?.keys.length === 0 && (
          <p className="p-6 text-center text-body-sm text-muted">No API keys yet.</p>
        )}
        {keysQuery.data?.keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-label text-ink-soft">{key.name}</p>
              <p className="mt-1 font-mono text-caption text-muted">{key.keyPrefix}</p>
              <p className="mt-1 text-caption text-muted">
                Created {formatDate(key.createdAt)}
                {key.lastUsedAt ? ` — last used ${formatDate(key.lastUsedAt)}` : " — never used"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                const ok = await confirm({
                  title: `Revoke "${key.name}"?`,
                  description:
                    "Any app still calling the API with this key starts getting 401s immediately. Keys can't be restored — you'd have to issue a new one.",
                  confirmLabel: "Revoke",
                  tone: "danger",
                });
                if (ok) revokeMutation.mutate(key.id);
              }}
              aria-label="Revoke key"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </Card>

      <Card variant="standard">
        <h3 className="text-label font-semibold text-ink">Using your key</h3>
        <p className="mt-1 text-body-sm text-muted">
          Send it as a bearer token on any endpoint — it acts as your account. Rate-limited to 120
          requests/minute per key.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface-3 p-3 font-mono text-caption text-ink-soft">
{`curl ${PUBLIC_API_BASE}/generations \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "apikey: ${SUPABASE_ANON_KEY}"`}
        </pre>
      </Card>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="New API key">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) createMutation.mutate(name.trim());
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production server"
              required
            />
          </div>
          <Button type="submit" loading={createMutation.isPending} className="w-full">
            Create key
          </Button>
        </form>
      </Modal>

      <Modal open={Boolean(revealedKey)} onOpenChange={() => setRevealedKey(null)} title="Save your key">
        <p className="text-body-sm text-muted">
          This is the only time you&apos;ll see the full key. Store it somewhere safe.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Input readOnly value={revealedKey ?? ""} className="font-mono" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => {
              if (revealedKey) navigator.clipboard.writeText(revealedKey);
              toast({ title: "Copied to clipboard", variant: "success" });
            }}
            aria-label="Copy key"
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <Button className="mt-4 w-full" onClick={() => setRevealedKey(null)}>
          Done
        </Button>
      </Modal>
    </div>
  );
}
