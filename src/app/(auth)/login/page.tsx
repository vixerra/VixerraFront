"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { apiFetch } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where the user was headed before the app bounced them here — a preset
  // studio, most often (see presetHref in presets-gallery.tsx). Carried on
  // to signup too, so "don't have an account?" doesn't lose the errand.
  const next = searchParams.get("next");
  const [serverError, setServerError] = useState<string | null>(null);
  // The password was right but the address was never confirmed. The backend
  // has already re-sent the link by the time it answers (403,
  // code "email_unverified"); this only decides what to show.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "email_unverified") {
          setUnverifiedEmail(data.email);
          return null;
        }
        throw new Error(json.error ?? "Something went wrong.");
      }
      return json;
    },
    onSuccess: (json) => {
      if (!json) return;
      router.push(next || "/dashboard");
      router.refresh();
    },
    onError: (err: Error) => setServerError(err.message),
  });

  return (
    <Card variant="standard">
      <h1 className="text-subheading font-semibold text-ink">Welcome back</h1>
      <p className="mt-2 text-body-sm text-muted">Log in to continue creating.</p>

      <form
        onSubmit={handleSubmit((data) => {
          setServerError(null);
          setUnverifiedEmail(null);
          mutation.mutate(data);
        })}
        className="mt-6 space-y-5"
        noValidate
      >
        {serverError && (
          <p className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-caption text-accent">
            {serverError}
          </p>
        )}
        {unverifiedEmail && (
          <div
            role="status"
            className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-caption text-ink"
          >
            <p>
              Your email isn&apos;t confirmed yet. We&apos;ve just sent a new link to{" "}
              <span className="font-medium">{unverifiedEmail}</span> — click it to finish
              signing in.
            </p>
            <ResendVerificationButton email={unverifiedEmail} className="mt-3" />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-caption text-brand hover:text-brand-hover"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-2"
            {...register("password")}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Log in
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-caption text-muted">or</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-6">
        <GoogleAuthButton />
      </div>

      <p className="mt-6 text-center text-body-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="text-brand hover:text-brand-hover"
        >
          Sign up
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card variant="standard" className="flex justify-center py-16">
          <Spinner />
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
