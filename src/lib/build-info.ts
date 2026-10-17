// Which build served a page. Vercel sets VERCEL_GIT_COMMIT_SHA and
// VERCEL_DEPLOYMENT_ID for every deployment; elsewhere (local dev) it reads
// "dev". Rendered as <meta name="x-build"> on every page and served from
// /api/version, so a check of the live site can compare pages against one
// expected commit instead of inferring the build from what the footer shows.

export const BUILD_SHA = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "dev";
export const BUILD_DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? null;
