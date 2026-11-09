/**
 * Site-wide constants. Build inputs, resolved in next.config.mjs (site-url.mjs): the public origin
 * (NESHEL_DOCS_SITE_URL, else the Vercel production domain, else the Vercel preview URL), whether the
 * build is indexable (production only), and NESHEL_DOCS_BASE_PATH (empty on Vercel: domain root).
 */
export const siteName = "Neshel-UI";
export const tagline = "Rooted in faith. Built with hope.";

const rawSiteUrl = process.env.NESHEL_DOCS_SITE_URL?.trim();

/** Canonical origin without trailing slash, or undefined for preview builds. */
export const siteUrl = rawSiteUrl ? rawSiteUrl.replace(/\/+$/, "") : undefined;

/** Base path the site is served under ("" at the domain root). */
export const basePath = (process.env.NESHEL_DOCS_BASE_PATH ?? "").replace(/\/+$/, "");

/** True for production builds meant for search engines (never for previews or local builds). */
export const indexable = process.env.NESHEL_DOCS_INDEXABLE === "true";

/** Absolute URL for a site path such as "/en/docs" (preview builds use localhost). */
export function absoluteUrl(path: string): string {
  return `${siteUrl ?? "http://localhost:3000"}${basePath}${path}`;
}

export const gitConfig = {
  user: "dannysequeira-dev",
  repo: "neshel-ui",
  branch: "main",
} as const;

export const repositoryUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

/** Edit link for a content file path relative to content/docs. */
export function editUrl(contentPath: string): string {
  return `${repositoryUrl}/edit/${gitConfig.branch}/apps/docs/content/docs/${contentPath}`;
}
