import type { Metadata } from "next";
import { dictionary } from "./dictionary";
import type { Locale } from "./i18n";
import { absoluteUrl, basePath, indexable, siteName, siteUrl, tagline } from "./site";

/** Site-level metadata (title template, robots, OG defaults) for a locale. */
export function siteMetadata(locale: Locale): Metadata {
  const t = dictionary(locale);
  return {
    metadataBase: new URL(`${siteUrl ?? "http://localhost:3000"}${basePath}/`),
    title: { default: `${siteName} — ${tagline}`, template: `%s | ${siteName}` },
    description: t.siteDescription,
    applicationName: siteName,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName,
      locale: locale === "es" ? "es_ES" : "en_US",
      images: [
        { url: absoluteUrl("/og.png"), width: 1200, height: 630, alt: `${siteName} — ${tagline}` },
      ],
    },
    twitter: { card: "summary_large_image", images: [absoluteUrl("/og.png")] },
    icons: {
      icon: `${basePath}/icon.png`,
      apple: `${basePath}/apple-icon.png`,
    },
  };
}

/** Canonical URL and hreflang alternates for a path that exists in the given locales. */
export function alternates(
  path: (locale: Locale) => string,
  current: Locale,
  available: readonly Locale[],
) {
  const languages: Record<string, string> = {};
  for (const locale of available) languages[locale] = absoluteUrl(path(locale));
  if (available.includes("en")) languages["x-default"] = absoluteUrl(path("en"));
  return { canonical: absoluteUrl(path(current)), languages };
}
