import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Container, Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { Dashboard } from "@/examples/dashboard/dashboard";
import { AdvancedForm } from "@/examples/form/advanced-form";
import { Landing } from "@/examples/landing/landing";
import { dictionary } from "@/lib/dictionary";
import { type ExampleSlug, exampleSlugs, exampleText, isExampleSlug } from "@/lib/examples";
import { isLocale, type Locale, locales } from "@/lib/i18n";
import { alternates } from "@/lib/metadata";

const components: Record<ExampleSlug, ComponentType> = {
  dashboard: Dashboard,
  form: AdvancedForm,
  landing: Landing,
};

type Params = { lang: string; slug: string };

export function generateStaticParams() {
  return locales.flatMap((lang) => exampleSlugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isExampleSlug(slug)) notFound();
  const locale: Locale = isLocale(lang) ? lang : "en";
  const text = exampleText[slug][locale];
  return {
    title: text.title,
    description: text.description,
    alternates: alternates((l) => `/${l}/examples/${slug}/`, locale, locales),
  };
}

/** The example's own files, read at build time: the code shown is the code that runs. */
async function sources(slug: ExampleSlug) {
  const dir = join(process.cwd(), "examples", slug);
  const files = (await readdir(dir)).filter((file) => /\.tsx?$/.test(file)).sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      code: (await readFile(join(dir, file), "utf8")).replace(/\r\n/g, "\n").trimEnd(),
    })),
  );
}

export default async function ExamplePage({ params }: { params: Promise<Params> }) {
  const { lang, slug } = await params;
  if (!isExampleSlug(slug)) notFound();
  const locale: Locale = isLocale(lang) ? lang : "en";
  const text = exampleText[slug][locale];
  const t = dictionary(locale);
  const Example = components[slug];
  const files = await sources(slug);

  return (
    <div className="py-10">
      <Container size="xl" gutter={{ base: "4", md: "8" }}>
        <Stack space="8">
          <Stack space="3">
            <Link href={`/${locale}/docs/examples/`} className="text-sm underline">
              ← {t.navExamples}
            </Link>
            <Heading as="h1" size="3xl">
              {text.title}
            </Heading>
            <Paragraph tone="muted" measure="wide">
              {text.description}
            </Paragraph>
          </Stack>
          <section
            aria-label={t.previewLabel}
            className="overflow-hidden rounded-xl border border-fd-border bg-[var(--neshel-background)]"
          >
            <Example />
          </section>
          <section aria-labelledby="example-source">
            <Stack space="3">
              <Heading as="h2" size="xl" id="example-source">
                {t.sourceLabel}
              </Heading>
              <Tabs items={files.map((f) => f.file)}>
                {files.map((f) => (
                  <Tab key={f.file} value={f.file}>
                    <ServerCodeBlock
                      code={f.code}
                      lang={f.file.endsWith(".tsx") ? "tsx" : "ts"}
                      themes={{
                        light: "github-light-high-contrast",
                        dark: "github-dark-high-contrast",
                      }}
                      codeblock={{ title: f.file }}
                    />
                  </Tab>
                ))}
              </Tabs>
            </Stack>
          </section>
        </Stack>
      </Container>
    </div>
  );
}
