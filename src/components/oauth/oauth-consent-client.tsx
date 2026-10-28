"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImageIcon, PlugZap, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMe } from "@/hooks/use-me";
import { apiFetch } from "@/lib/api-client";
import { siteHref } from "@/lib/hosts";

/** The authorization request as the MCP client sent it, passed through to the
 *  API untouched — routes/oauth.ts there is what validates it. */
const OAUTH_PARAMS = [
  "client_id",
  "redirect_uri",
  "response_type",
  "code_challenge",
  "code_challenge_method",
  "state",
  "scope",
  "resource",
] as const;

const PERMISSIONS = [
  { icon: Sparkles, text: "Generate images and videos, spending your credits" },
  { icon: Wallet, text: "See your plan, credits and generations" },
  { icon: ImageIcon, text: "Upload images to use in your generations" },
];

/**
 * The OAuth consent screen for MCP clients such as claude.ai connectors.
 *
 * Standalone (like /invite) rather than under (app): someone arriving from
 * Claude may not be signed in, and the (app) layout would hard-redirect to
 * /login before this page could send them there with ?next= pointing back,
 * request and all. The client and redirect URI are checked by the API before
 * anything is shown, and an invalid pair is never redirected to.
 */
export function OAuthConsentClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: me, isLoading: meLoading } = useMe();
  const [error, setError] = useState<{ message: string; upgrade: boolean } | null>(null);

  const clientId = searchParams.get("client_id") ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "";

  const clientQuery = useQuery({
    queryKey: ["oauth-client", clientId, redirectUri],
    enabled: Boolean(me),
    retry: false,
    queryFn: async (): Promise<{ name: string; redirectHost: string }> => {
      const qs = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri });
      const res = await apiFetch(`/api/oauth/client?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "This connection request isn't valid.");
      return json;
    },
  });

  const decide = useMutation({
    mutationFn: async (approve: boolean) => {
      const body: Record<string, unknown> = { approve };
      for (const key of OAUTH_PARAMS) {
        const value = searchParams.get(key);
        if (value !== null) body[key] = value;
      }
      const res = await apiFetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const failure = new Error(json.error ?? "Couldn't complete the connection.") as Error & { code?: string };
        failure.code = json.code;
        throw failure;
      }
      return json as { redirectTo: string };
    },
    // A full navigation, not router.push: the destination is the client's
    // own callback (claude.ai, or a native app's scheme), outside this app.
    onSuccess: ({ redirectTo }) => window.location.assign(redirectTo),
    onError: (err: Error & { code?: string }) =>
      setError({ message: err.message, upgrade: err.code === "api_access_required" }),
  });

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Spinner size={28} />
      </div>
    );
  }

  if (!me) {
    const here = `${pathname}?${searchParams.toString()}`;
    router.replace(`/login?next=${encodeURIComponent(here)}`);
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <Card variant="compact" className="w-full max-w-md p-8">
        {clientQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size={24} />
          </div>
        ) : clientQuery.isError ? (
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent/10">
              <PlugZap className="size-5 text-accent" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-subheading font-semibold text-ink">Can&apos;t connect</h1>
            <p className="mt-2 text-body-sm text-muted">{(clientQuery.error as Error).message}</p>
          </div>
        ) : (
          <>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10">
              <PlugZap className="size-5 text-brand-ink" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-subheading font-semibold text-ink">
              {clientQuery.data?.name} wants to connect to your Vixlens account
            </h1>
            <p className="mt-2 text-body-sm text-muted">
              Signed in as <span className="text-ink">{me.email}</span>
            </p>

            <p className="mt-6 text-caption font-bold tracking-[0.06em] text-text-tertiary uppercase">
              It will be able to
            </p>
            <ul className="mt-3 space-y-3">
              {PERMISSIONS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-body-sm text-ink-soft">
                  <Icon className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>

            {error && (
              <p className="mt-6 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-caption text-accent">
                {error.message}{" "}
                {error.upgrade && (
                  <a href={siteHref("/pricing#plans")} className="font-semibold underline underline-offset-2">
                    See plans
                  </a>
                )}
              </p>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                variant="secondary"
                className="w-full sm:flex-1"
                disabled={decide.isPending}
                onClick={() => {
                  setError(null);
                  decide.mutate(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:flex-1"
                loading={decide.isPending && decide.variables === true}
                disabled={decide.isPending}
                onClick={() => {
                  setError(null);
                  decide.mutate(true);
                }}
              >
                Allow
              </Button>
            </div>

            <p className="mt-6 flex items-start gap-2 text-caption text-muted">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                You&apos;ll be sent back to <span className="text-ink-soft">{clientQuery.data?.redirectHost}</span>.
                Only allow apps you trust: they can spend your credits.
              </span>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
