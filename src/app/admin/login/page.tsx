"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { apiFetch } from "@/lib/api-client";

/**
 * Staff sign-in — a separate page, a separate endpoint and a separate cookie
 * from /login (see the backend's lib/admin-session.ts).
 *
 * Nothing here links to the app's login, signup or password reset, and there
 * is no Google button: admin is granted by an operator running an UPDATE, so
 * offering a "create account" or OAuth path would imply a self-serve route to
 * staff access that deliberately does not exist. It also never says whether
 * an email is a real account or merely lacks admin — the API returns one
 * indistinguishable error for every failure, and this page just shows it.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await apiFetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
      return json;
    },
    onSuccess: () => {
      // No ?next= support, unlike the app's login. An unauthenticated hit on
      // an admin URL should not be able to steer where a successful sign-in
      // lands — every session starts at the dashboard.
      router.push("/admin");
      router.refresh();
    },
    onError: (err: Error) => setServerError(err.message),
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-line bg-surface-2">
          <ShieldCheck className="size-6 text-brand-ink" aria-hidden="true" />
        </span>
        <p className="font-display text-label font-semibold tracking-wide text-muted uppercase">
          Staff access
        </p>
      </div>

      <Card variant="standard" className="w-full max-w-md">
        <h1 className="text-subheading font-semibold text-ink">Admin sign in</h1>
        <p className="mt-2 text-body-sm text-muted">
          This is not the customer login. Your app account and your admin
          session are separate.
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
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" autoComplete="username" {...register("email")} />
            <FieldError>{errors.email?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </div>

          <Button type="submit" loading={mutation.isPending} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-caption text-muted">
          Admin access is granted by an operator. There is no self-serve signup.
        </p>
      </Card>
    </div>
  );
}
