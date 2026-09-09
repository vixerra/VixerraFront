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
import { registerSchema, type RegisterInput } from "@/lib/validation";
import { apiFetch } from "@/lib/api-client";
import { TIER_INFO } from "@/lib/constants";
import { formatCredits } from "@/lib/utils";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Same ?next= contract as login: someone who reached a preset without an
  // account signs up and lands on that preset, not on a dashboard they then
  // have to navigate back out of.
  const next = searchParams.get("next");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const mutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json;
    },
    onSuccess: () => {
      router.push(next || "/dashboard");
      router.refresh();
    },
    onError: (err: Error) => setServerError(err.message),
  });

  return (
    <Card variant="standard">
      <h1 className="text-subheading font-semibold text-ink">Create your account</h1>
      <p className="mt-2 text-body-sm text-muted">
        Start with {formatCredits(TIER_INFO.free.monthlyCredits)} free credits — no card required.
      </p>

      <form
        onSubmit={handleSubmit((data) => {
          setServerError(null);
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
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          <FieldError>{errors.password?.message}</FieldError>
          {!errors.password && (
            <p className="mt-1.5 text-caption text-muted">
              At least 8 characters, with a letter and a number.
            </p>
          )}
        </div>
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Create account
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
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-brand hover:text-brand-hover"
        >
          Log in
        </Link>
      </p>
      <p className="mt-4 text-center text-caption text-muted">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="text-brand hover:text-brand-hover">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-brand hover:text-brand-hover">
          Privacy Policy
        </Link>
        .
      </p>
    </Card>
  );
}

// Wrapped for the same reason the login page is: useSearchParams above
// suspends, and without a boundary the whole route opts out of static
// prerendering.
export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card variant="standard" className="flex justify-center py-16">
          <Spinner />
        </Card>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
