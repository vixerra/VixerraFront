import { createClient } from "@supabase/supabase-js";

// Browser-only Supabase client used solely to drive Google OAuth
// (supabase.auth.signInWithOAuth) and read back the resulting session. This
// app doesn't use Supabase Auth as its source of truth — after OAuth
// completes, /auth/callback bridges the Supabase session into our own
// custom JWT-cookie session (see supabase/functions/api/routes/auth.ts,
// POST /auth/oauth/session) and the Supabase client session is discarded.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseBrowserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    detectSessionInUrl: true,
  },
});
