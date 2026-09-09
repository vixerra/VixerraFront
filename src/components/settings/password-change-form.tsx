"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { passwordChangeSchema, type PasswordChangeInput } from "@/lib/validation";
import { apiFetch } from "@/lib/api-client";

export function PasswordChangeForm() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PasswordChangeInput>({ resolver: zodResolver(passwordChangeSchema) });

  async function onSubmit(data: PasswordChangeInput) {
    const res = await apiFetch("/api/user/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      toast({ title: "Couldn't change password", description: json.error, variant: "error" });
      return;
    }
    toast({ title: "Password updated", variant: "success" });
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
        <FieldError>{errors.currentPassword?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
        <FieldError>{errors.newPassword?.message}</FieldError>
      </div>
      <Button type="submit" loading={isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
