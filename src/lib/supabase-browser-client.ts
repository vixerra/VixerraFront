import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-only Supabase client used solely to drive Google OAuth
// (supabase.auth.signInWithOAuth) and read back the resulting session. This
// app doesn't use Supabase Auth as its source of truth — after OAuth
// completes, /auth/callback bridges the Supabase session into our own
// custom JWT-cookie session (see supabase/functions/api/routes/auth.ts,
// POST /auth/oauth/session) and the Supabase client session is discarded.
//
// Created on first use, not at import: createClient throws on an empty URL,
// and at module scope that took down `next build` itself whenever the build
// environment lacked NEXT_PUBLIC_SUPABASE_URL (every page importing the
// Google button is prerendered). Every caller runs in an effect or a click
// handler, so a missing variable now fails the one auth action, not the
// whole deploy.
let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      auth: {
        persistSession: false,
        detectSessionInUrl: true,
      },
    },
  );
  return client;
}
