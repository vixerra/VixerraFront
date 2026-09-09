"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { supabaseBrowserClient } from "@/lib/supabase-browser-client";
import { apiFetch } from "@/lib/api-client";

const schema = z
  .object({
    password: z
      .string()
      .min(8, { error: "Use at least 8 characters." })
      .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
      .regex(/[0-9]/, { error: "Include at least one number." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });
type ResetPasswordInput = z.infer<typeof schema>;

// Supabase's recovery-email link lands here with the session in the URL
// (same detectSessionInUrl mechanism /auth/callback relies on for Google
// OAuth) — the actual password update still goes through our own backend
// (POST /auth/reset-password), since our User table, not auth.users, is
// this app's source of truth for login.
function ResetPasswordForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null | undefined>(undefined);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabaseBrowserClient.auth.getSession().then(({ data }) => {
      if (!cancelled) setAccessToken(data.session?.access_token ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordInput) => {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, newPassword: data.password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
    },
    onSuccess: async () => {
      await supabaseBrowserClient.auth.signOut();
      queryClient.clear();
      setDone(true);
    },
  });

  if (accessToken === undefined) {
    return (
      <Card variant="standard" className="flex justify-center py-16">
        <Spinner size={28} />
      </Card>
    );
  }

  if (!accessToken) {
    return (
      <Card variant="standard" className="text-center">
        <XCircle className="mx-auto size-8 text-accent" aria-hidden="true" />
        <h1 className="mt-4 text-subheading font-semibold text-ink">This link is invalid or expired</h1>
        <p className="mt-2 text-body-sm text-muted">Request a new reset link and try again.</p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-body-sm text-brand hover:text-brand-hover"
        >
          Send another link
        </Link>
      </Card>
    );
  }

  if (done) {
    return (
      <Card variant="standard" className="text-center">
        <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden="true" />
        <h1 className="mt-4 text-subheading font-semibold text-ink">Password updated</h1>
        <p className="mt-2 text-body-sm text-muted">You&apos;re signed in — head to your dashboard.</p>
        <Button className="mt-6 w-full" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </Card>
    );
  }

  return (
    <Card variant="standard">
      <h1 className="text-subheading font-semibold text-ink">Set a new password</h1>
      <p className="mt-2 text-body-sm text-muted">Choose something you haven&apos;t used before.</p>
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="mt-6 space-y-5"
        noValidate
      >
        {mutation.error && (
          <p className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-caption text-accent">
            {mutation.error.message}
          </p>
        )}
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Update password
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card variant="standard" className="flex justify-center py-16">
          <Spinner />
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
