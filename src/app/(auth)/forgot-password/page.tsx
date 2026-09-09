"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

const schema = z.object({ email: z.email({ error: "Enter a valid email." }) });
type ForgotPasswordInput = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(schema) });

  async function onSubmit(data: ForgotPasswordInput) {
    // The backend always responds success here regardless of whether the
    // address has an account — that's deliberate (see POST
    // /auth/forgot-password), so this UI can't be used to check which
    // emails are registered either. Network/validation failures still
    // surface below via react-hook-form's own error handling.
    await apiFetch("/api/auth/forgot-password", {
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
        <h1 className="mt-4 text-subheading font-semibold text-ink">
          Check your email
        </h1>
        <p className="mt-2 text-body-sm text-muted">
          If an account exists for that address, we&apos;ve sent a reset link.
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
      <h1 className="text-subheading font-semibold text-ink">Reset your password</h1>
      <p className="mt-2 text-body-sm text-muted">We&apos;ll email you a link to reset it.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Send reset link
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
