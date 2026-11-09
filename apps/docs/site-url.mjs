// Public origin of the documentation build (deployment decision 2026-11-09: Vercel).
// Resolution order — no domain is ever invented:
//   1. NESHEL_DOCS_SITE_URL (explicit, e.g. a custom domain chosen by the owner);
//   2. on Vercel production builds: https://$VERCEL_PROJECT_PRODUCTION_URL (the project's real
//      production domain, injected by Vercel);
//   3. on Vercel preview builds: https://$VERCEL_URL (that deployment's own URL);
//   4. otherwise none (local and CI builds: absolute URLs fall back to http://localhost:3000).
// Only (1) and Vercel production builds are indexable; previews and local builds are noindex.

/** @param {Record<string, string | undefined>} env */
export function resolveSite(env = process.env) {
  const strip = (value) => value?.trim().replace(/\/+$/, "") || undefined;
  const withScheme = (host) =>
    host ? (/^https?:\/\//.test(host) ? host : `https://${host}`) : undefined;
  const explicit = strip(env.NESHEL_DOCS_SITE_URL);
  if (explicit) return { siteUrl: explicit, indexable: true, source: "NESHEL_DOCS_SITE_URL" };
  if (env.VERCEL_ENV === "production" && strip(env.VERCEL_PROJECT_PRODUCTION_URL)) {
    return {
      siteUrl: withScheme(strip(env.VERCEL_PROJECT_PRODUCTION_URL)),
      indexable: true,
      source: "VERCEL_PROJECT_PRODUCTION_URL",
    };
  }
  if (env.VERCEL && strip(env.VERCEL_URL)) {
    return { siteUrl: withScheme(strip(env.VERCEL_URL)), indexable: false, source: "VERCEL_URL" };
  }
  return { siteUrl: undefined, indexable: false, source: "none" };
}
