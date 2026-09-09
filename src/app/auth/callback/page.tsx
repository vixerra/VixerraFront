"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { supabaseBrowserClient } from "@/lib/supabase-browser-client";
import { apiFetch } from "@/lib/api-client";

// Standalone route (outside the (auth) group) that completes the Google
// OAuth handoff: Supabase Auth redirects here with the session in the URL,
// we hand its access_token to our backend to bridge it into our own
// session cookie (see POST /auth/oauth/session), then drop the Supabase
// client session — this app doesn't use it after that point.
export default function AuthCallbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data, error: sessionError } = await supabaseBrowserClient.auth.getSession();
      if (cancelled) return;

      const accessToken = data.session?.access_token;
      if (sessionError || !accessToken) {
        setError("Google sign-in failed or was cancelled.");
        return;
      }

      const res = await apiFetch("/api/auth/oauth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });

      await supabaseBrowserClient.auth.signOut();
      if (cancelled) return;

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Something went wrong signing you in.");
        return;
      }

      queryClient.clear();
      router.replace("/dashboard");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card variant="standard" className="w-full max-w-md text-center">
        {error ? (
          <>
            <p className="text-body-sm text-accent">{error}</p>
            <Link href="/login" className="mt-4 inline-block text-brand hover:text-brand-hover">
              Back to login
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <Spinner size={28} />
            <p className="text-body-sm text-muted">Signing you in…</p>
          </div>
        )}
      </Card>
    </div>
  );
}
