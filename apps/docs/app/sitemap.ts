import type { MetadataRoute } from "next";
import { exampleSlugs } from "@/lib/examples";
import { locales } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { source } from "@/lib/source";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    entries.push({ url: absoluteUrl(`/${locale}/`) });
    for (const slug of exampleSlugs)
      entries.push({ url: absoluteUrl(`/${locale}/examples/${slug}/`) });
    for (const page of source.getPages(locale)) {
      if (page.locale !== locale) continue; // fallbacks are not separate documents
      entries.push({ url: absoluteUrl(page.url.endsWith("/") ? page.url : `${page.url}/`) });
    }
  }
  return entries;
}
