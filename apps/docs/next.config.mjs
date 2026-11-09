import { createMDX } from "fumadocs-mdx/next";
import { resolveSite } from "./site-url.mjs";

const withMDX = createMDX();

const basePath = (process.env.NESHEL_DOCS_BASE_PATH ?? "").replace(/\/+$/, "");
// Explicit URL, else the Vercel production domain, else the Vercel preview URL (site-url.mjs).
const site = resolveSite();

/** @type {import('next').NextConfig} */
const config = {
  // Static export (research R2), deployed on Vercel from apps/docs/out (see apps/docs/vercel.json).
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  env: {
    NESHEL_DOCS_BASE_PATH: basePath,
    NESHEL_DOCS_SITE_URL: site.siteUrl ?? "",
    NESHEL_DOCS_INDEXABLE: site.indexable ? "true" : "",
  },
  experimental: { globalNotFound: true },
};

export default withMDX(config);
