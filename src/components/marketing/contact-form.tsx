"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input, Textarea, Label, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

// Split out of the /contact page so that page can stay a server component and
// carry its own title, description and canonical — a "use client" page can't
// export metadata, so the whole route was inheriting the site-wide defaults.

const contactSchema = z.object({
  name: z.string().trim().min(2, { error: "Enter your name." }),
  email: z.email({ error: "Enter a valid email." }),
  message: z
    .string()
    .trim()
    .min(10, { error: "Tell us a bit more (10+ characters)." })
    .max(2000),
});
type ContactInput = z.infer<typeof contactSchema>;

export function ContactForm() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(data: ContactInput) {
    const res = await apiFetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast({
        title: "Couldn't send your message",
        description: json.error ?? "Something went wrong — try again in a moment.",
        variant: "error",
      });
      return;
    }
    toast({
      title: "Message sent",
      description: "Thanks for reaching out — we'll get back to you within a day.",
      variant: "success",
    });
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6" noValidate>
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
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" rows={5} {...register("message")} />
        <FieldError>{errors.message?.message}</FieldError>
      </div>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Send message
      </Button>
    </form>
  );
}
