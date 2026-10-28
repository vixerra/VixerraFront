"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * The public MCP endpoint. A rewrite on the api host (next.config.ts) sends
 * it to the Edge Function's /mcp route and adds the gateway key, so a client
 * only ever sends its own credential (an OAuth token, or an API key) — which
 * is why no snippet below has an `apikey` header, unlike the REST examples on
 * /developers.
 */
export const MCP_ENDPOINT = "https://api.vixlens.com/mcp";

function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-muted transition-colors hover:border-brand/60 hover:text-brand",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
    </button>
  );
}

/** The endpoint as a copyable pill, for the hero. */
export function McpEndpoint() {
  return (
    <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-line bg-surface-2 py-2 pr-2 pl-4">
      <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
      <code className="min-w-0 flex-1 truncate font-mono text-body-sm text-ink">{MCP_ENDPOINT}</code>
      <CopyButton text={MCP_ENDPOINT} label="Copy MCP endpoint" />
    </div>
  );
}

const CLIENTS = [
  {
    // OAuth, not a key: claude.ai sends the user to the consent screen
    // (/oauth/authorize) and keeps the token itself — routes/oauth.ts in the API.
    id: "claude-ai",
    label: "Claude",
    where:
      "In claude.ai or the Claude app: Settings → Connectors → Add custom connector. Paste this URL, click Add, then Connect and allow access. No API key needed.",
    language: "text",
    code: MCP_ENDPOINT,
  },
  {
    id: "claude-code",
    label: "Claude Code",
    where: "Run once in your terminal.",
    language: "bash",
    code: `claude mcp add --transport http vixlens ${MCP_ENDPOINT} \\
  --header "Authorization: Bearer sk_live_..."`,
  },
  {
    id: "cursor",
    label: "Cursor",
    where: "Add to ~/.cursor/mcp.json (or .cursor/mcp.json in a project).",
    language: "json",
    code: `{
  "mcpServers": {
    "vixlens": {
      "url": "${MCP_ENDPOINT}",
      "headers": { "Authorization": "Bearer sk_live_..." }
    }
  }
}`,
  },
  {
    id: "vscode",
    label: "VS Code",
    where: "Add to .vscode/mcp.json, then start the server from the file.",
    language: "json",
    code: `{
  "servers": {
    "vixlens": {
      "type": "http",
      "url": "${MCP_ENDPOINT}",
      "headers": { "Authorization": "Bearer sk_live_..." }
    }
  }
}`,
  },
] as const;

/** One tab per client, each with its own copyable snippet. */
export function McpClientSetup() {
  return (
    <Tabs defaultValue={CLIENTS[0].id}>
      <TabsList aria-label="MCP client">
        {CLIENTS.map((client) => (
          <TabsTrigger key={client.id} value={client.id}>
            {client.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {CLIENTS.map((client) => (
        <TabsContent key={client.id} value={client.id} className="pt-5 focus-visible:outline-none">
          <div className="flex items-start justify-between gap-4">
            <p className="text-body-sm text-muted">{client.where}</p>
            <CopyButton text={client.code} label={`Copy ${client.label} setup`} />
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface-3 p-4 font-mono text-caption text-ink-soft">
            <code data-language={client.language}>{client.code}</code>
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}
