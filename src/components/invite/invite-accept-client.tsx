"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Users, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMe } from "@/hooks/use-me";
import { apiFetch } from "@/lib/api-client";

// Standalone route (like /auth/callback) rather than under (app) — someone
// clicking an invite email link isn't necessarily logged in yet, and the
// (app) layout hard-redirects to /login on any unauthenticated visit
// before this page would even get a chance to send them to /login?next=
// (which round-trips them right back here after they sign in).
export function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/organization/invites/${token}/accept`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't accept this invite.");
    },
    onSuccess: () => setAccepted(true),
    onError: (err: Error) => setError(err.message),
  });

  if (meLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Spinner size={28} />
      </div>
    );
  }

  if (!me) {
    router.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card variant="standard" className="w-full max-w-md text-center">
        {accepted ? (
          <>
            <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden="true" />
            <h1 className="mt-4 text-subheading font-semibold text-ink">You&apos;re in</h1>
            <p className="mt-2 text-body-sm text-muted">You&apos;ve joined the team.</p>
            <Link href="/settings/team" className="mt-6 inline-block text-body-sm text-brand hover:text-brand-hover">
              View your team
            </Link>
          </>
        ) : (
          <>
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand/10">
              <Users className="size-5 text-brand" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-subheading font-semibold text-ink">Team invite</h1>
            <p className="mt-2 text-body-sm text-muted">
              Accept to join this team — you&apos;ll generate against their shared credit pool.
            </p>
            {error && (
              <p className="mt-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-caption text-accent">
                {error}
              </p>
            )}
            <Button
              className="mt-6 w-full"
              loading={acceptMutation.isPending}
              onClick={() => {
                setError(null);
                acceptMutation.mutate();
              }}
            >
              Accept invite
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
