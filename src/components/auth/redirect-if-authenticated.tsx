"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-me";

// Mirrors the old proxy.ts behavior of bouncing an already-logged-in user
// away from /login, /signup, /forgot-password — done client-side since only
// the browser can see the cross-site session cookie (see src/proxy.ts).
export function RedirectIfAuthenticated() {
  const router = useRouter();
  const { data: user } = useMe();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  return null;
}
