import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const basePath = (process.env.NESHEL_DOCS_BASE_PATH ?? "").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const config = {
  // Static export (research R2): deployable to any static host, e.g. GitHub Pages.
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  env: {
    NESHEL_DOCS_BASE_PATH: basePath,
    NESHEL_DOCS_SITE_URL: process.env.NESHEL_DOCS_SITE_URL ?? "",
  },
  experimental: { globalNotFound: true },
};

export default withMDX(config);
