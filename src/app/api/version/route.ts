import { BUILD_DEPLOYMENT, BUILD_SHA } from "@/lib/build-info";

// The commit and deployment serving this request. Dynamic and uncached, so
// it always reflects what is live right now — compare it with the
// <meta name="x-build"> of any page to see whether that page is current.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { commit: BUILD_SHA, deployment: BUILD_DEPLOYMENT },
    { headers: { "Cache-Control": "no-store" } },
  );
}
