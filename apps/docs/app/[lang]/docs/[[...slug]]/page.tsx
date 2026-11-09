import { Callout } from "fumadocs-ui/components/callout";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import { dictionary } from "@/lib/dictionary";
import { isLocale, type Locale, locales } from "@/lib/i18n";
import { alternates } from "@/lib/metadata";
import { editUrl } from "@/lib/site";
import { source } from "@/lib/source";

type Params = { lang: string; slug?: string[] };

function resolve(params: Params) {
  const locale: Locale = isLocale(params.lang) ? params.lang : "en";
  const page = source.getPage(params.slug, locale);
  return { locale, page };
}

/** Locales in which this page exists as a real translation (not an English fallback). */
function translatedLocales(slug: string[] | undefined): Locale[] {
  return locales.filter((locale) => source.getPage(slug, locale)?.locale === locale);
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const { locale, page } = resolve(resolved);
  if (!page) notFound();
  const t = dictionary(locale);
  const isFallback = page.locale !== undefined && page.locale !== locale;
  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {isFallback ? <Callout type="warn" title={t.missingTranslation} /> : null}
      <DocsBody lang={isFallback ? page.locale : undefined}>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) }, locale)} />
      </DocsBody>
      <EditOnGitHub
        href={editUrl(
          page.path.startsWith(`${page.locale}/`) ? page.path : `${page.locale}/${page.path}`,
        )}
      />
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams("slug", "lang");
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = await params;
  const { locale, page } = resolve(resolved);
  if (!page) notFound();
  const slugPath = (resolved.slug ?? []).map((s) => `${s}/`).join("");
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: alternates(
      (l) => `/${l}/docs/${slugPath}`,
      locale,
      translatedLocales(resolved.slug),
    ),
    openGraph: { title: page.data.title, description: page.data.description },
  };
}
