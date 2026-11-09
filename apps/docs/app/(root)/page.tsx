import { Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";
import Link from "next/link";
import { CanonicalLogo } from "@/components/brand";
import { alternates } from "@/lib/metadata";
import { basePath, tagline } from "@/lib/site";

export const metadata = {
  alternates: alternates((l) => `/${l}/`, "en", ["en", "es"]),
};

/** "/" redirects to the English home; the links serve users without automatic redirects. */
export default function LanguageChooser() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${basePath}/en/`} />
      <main className="grid min-h-screen place-items-center p-6">
        <Stack space="6" alignX="center">
          <CanonicalLogo width={200} alt={`Neshel-UI — ${tagline}`} />
          <Heading as="h1" size="xl">
            Neshel-UI
          </Heading>
          <Paragraph tone="muted">Choose a language · Elige un idioma</Paragraph>
          <Stack as="ul" space="2" alignX="center">
            <li>
              <Link href="/en/" hrefLang="en" lang="en" className="underline">
                English
              </Link>
            </li>
            <li>
              <Link href="/es/" hrefLang="es" lang="es" className="underline">
                Español
              </Link>
            </li>
          </Stack>
        </Stack>
      </main>
    </>
  );
}
