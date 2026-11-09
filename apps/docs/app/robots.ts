import type { MetadataRoute } from "next";
import { absoluteUrl, indexable } from "@/lib/site";

export const dynamic = "force-static";

/** Preview builds (no NESHEL_DOCS_SITE_URL) disallow crawling; public builds allow it. */
export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: absoluteUrl("/sitemap.xml") };
}
