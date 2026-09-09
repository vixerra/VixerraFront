import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route protection used to happen here via a session-cookie presence check,
// but that only works when the frontend and API are same-site. Now that the
// frontend calls the Supabase Edge Function directly (a different
// registrable domain), the session cookie is scoped to *.supabase.co and is
// never sent on requests to this app's own origin — this proxy structurally
// cannot see it. Route protection now lives client-side instead (see
// AppShell's useMe()-based guard and RedirectIfAuthenticated), since only
// the browser (holding the cross-site cookie) and the Edge API can tell
// whether a session is valid.
export function proxy(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
