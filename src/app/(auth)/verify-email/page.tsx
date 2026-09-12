"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { supabaseBrowserClient } from "@/lib/supabase-browser-client";
import { apiFetch } from "@/lib/api-client";
import { takePostVerifyNext } from "@/lib/post-verify-next";

// The signup-verification email links here. Same mechanics as /reset-password
// and /auth/callback: Supabase Auth redirects with a session in the URL
// fragment, the browser client picks it up (detectSessionInUrl), and we hand
// its access_token to our own backend (POST /auth/verify-email), which marks
// the account verified and sets our session cookie. The Supabase session is
// dropped right after — this app never uses it past this point.
//
// No Suspense wrapper: nothing here reads useSearchParams. The token lives
// in the fragment, which only the browser ever sees.
type Phase = "verifying" | "done" | "failed";

export default function VerifyEmailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data } = await supabaseBrowserClient.auth.getSession();
      if (cancelled) return;

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        // Reached without a session in the URL: a stale link, one already
        // consumed (Supabase links are single-use — a mail scanner's
        // pre-fetch can burn it), or someone typing the address by hand.
        setPhase("failed");
        return;
      }

      const res = await apiFetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });
      await supabaseBrowserClient.auth.signOut();
      if (cancelled) return;

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Something went wrong verifying your email.");
        setPhase("failed");
        return;
      }

      // The backend signed them in; drop whatever "not authenticated" the
      // (auth) layout's useMe() cached before the cookie existed.
      queryClient.clear();
      setPhase("done");
      router.replace(takePostVerifyNext() ?? "/dashboard");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, queryClient]);

  if (phase === "failed") return <ExpiredLinkCard message={error} />;

  return (
    <Card variant="standard" className="text-center">
      {phase === "done" ? (
        <>
          <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden="true" />
          <h1 className="mt-4 text-subheading font-semibold text-ink">Email confirmed</h1>
          <p className="mt-2 text-body-sm text-muted">Taking you to your dashboard…</p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <Spinner size={28} />
          <p className="text-body-sm text-muted">Confirming your email…</p>
        </div>
      )}
    </Card>
  );
}

const resendSchema = z.object({ email: z.email({ error: "Enter a valid email." }) });
type ResendInput = z.infer<typeof resendSchema>;

// The link didn't carry a usable session, so the address isn't known here
// — ask for it. The endpoint always answers 200 (no account enumeration),
// so the confirmation copy stays conditional, as on /forgot-password.
function ExpiredLinkCard({ message }: { message: string | null }) {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendInput>({ resolver: zodResolver(resendSchema) });

  async function onSubmit(data: ResendInput) {
    await apiFetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSent(true);
  }

  if (sent) {
    return (
      <Card variant="standard" className="text-center">
        <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden="true" />
        <h1 className="mt-4 text-subheading font-semibold text-ink">Check your email</h1>
        <p className="mt-2 text-body-sm text-muted">
          If that address has an unverified account, we&apos;ve sent a fresh link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-body-sm text-brand hover:text-brand-hover"
        >
          Back to log in
        </Link>
      </Card>
    );
  }

  return (
    <Card variant="standard">
      <div className="text-center">
        <XCircle className="mx-auto size-8 text-accent" aria-hidden="true" />
        <h1 className="mt-4 text-subheading font-semibold text-ink">
          This link is invalid or expired
        </h1>
        <p className="mt-2 text-body-sm text-muted">
          {message ?? "Verification links work once and expire after an hour."} Enter your email
          and we&apos;ll send a new one.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Send a new link
        </Button>
      </form>
      <p className="mt-6 text-center text-body-sm text-muted">
        <Link href="/login" className="text-brand hover:text-brand-hover">
          Back to log in
        </Link>
      </p>
    </Card>
  );
}
