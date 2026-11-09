import { Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";
import Link from "next/link";
import { dictionary } from "@/lib/dictionary";
import { isLocale } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const t = dictionary(locale);
  return (
    <main className="p-8">
      <Stack space="4">
        <Heading as="h1">Neshel-UI</Heading>
        <Paragraph>{t.siteDescription}</Paragraph>
        <Link href={`/${locale}/docs/`}>{t.openDocs}</Link>
      </Stack>
    </main>
  );
}
