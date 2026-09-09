"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/validation";
import { apiFetch } from "@/lib/api-client";

export function ProfileForm({
  initialName,
  initialAvatarUrl,
  email,
}: {
  initialName: string;
  initialAvatarUrl: string | null;
  email: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { name: initialName, avatarUrl: initialAvatarUrl ?? "" },
  });

  async function onSubmit(data: ProfileUpdateInput) {
    const res = await apiFetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      toast({ title: "Couldn't save", description: json.error, variant: "error" });
      return;
    }
    toast({ title: "Profile updated", variant: "success" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled readOnly />
      </div>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register("name")} />
        <FieldError>{errors.name?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
        <Input id="avatarUrl" placeholder="https://…" {...register("avatarUrl")} />
        <FieldError>{errors.avatarUrl?.message}</FieldError>
      </div>
      <Button type="submit" loading={isSubmitting}>
        Save changes
      </Button>
    </form>
  );
}
