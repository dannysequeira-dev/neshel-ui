import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@neshel-ui/components";
import { Center, Container, Grid, Inline, Stack } from "@neshel-ui/layout";
import { Caption, Heading, Paragraph, Text } from "@neshel-ui/typography";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import type { Metadata } from "next";
import Link from "next/link";
import { CanonicalLogo } from "@/components/brand";
import { HomeDemo } from "@/components/home/home-demo";
import { dictionary } from "@/lib/dictionary";
import { isLocale, type Locale, locales } from "@/lib/i18n";
import { alternates } from "@/lib/metadata";
import { release } from "@/lib/release";
import { repositoryUrl, tagline } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  return { alternates: alternates((l) => `/${l}/`, locale, locales) };
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "en";
  const t = dictionary(locale);
  const docs = `/${locale}/docs`;

  const features = [
    { title: t.featureLayoutTitle, text: t.featureLayoutText, href: `${docs}/layout/` },
    { title: t.featureTypeTitle, text: t.featureTypeText, href: `${docs}/typography/` },
    { title: t.featureThemeTitle, text: t.featureThemeText, href: `${docs}/guides/theming/` },
    { title: t.featureA11yTitle, text: t.featureA11yText, href: `${docs}/guides/accessibility/` },
    { title: t.featureCompTitle, text: t.featureCompText, href: `${docs}/components/` },
  ];

  return (
    <div className="py-12 md:py-20">
      <Container size="xl" gutter={{ base: "4", md: "8" }}>
        <Stack space={{ base: "16", md: "24" }}>
          {/* Hero */}
          <Grid columns={{ base: 1, lg: 2 }} space={{ base: "10", lg: "16" }} alignY="center">
            <Stack space="6" alignX={{ base: "center", lg: "start" }}>
              <Badge variant="outline">
                {release.published ? `v${release.target}` : t.releaseBadge}
              </Badge>
              <Heading
                as="h1"
                size={{ base: "3xl", md: "5xl" }}
                align={{ base: "center", lg: "start" }}
                wrap="balance"
              >
                Neshel-UI
              </Heading>
              <Text size="xl" tone="primary" weight="medium" className="text-center lg:text-start">
                {tagline}
              </Text>
              <Paragraph
                size="lg"
                tone="muted"
                measure="comfortable"
                align={{ base: "center", lg: "start" }}
              >
                {t.heroLead}
              </Paragraph>
              <Inline space="3" wrap>
                <Button asChild size="lg">
                  <Link href={`${docs}/getting-started/`}>{t.ctaStart}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={`${docs}/components/`}>{t.ctaComponents}</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <a href={repositoryUrl}>{t.ctaGithub}</a>
                </Button>
              </Inline>
              <Stack space="2" className="w-full max-w-xl">
                <Caption>{t.installLabel}</Caption>
                <ServerCodeBlock
                  code="pnpm add @neshel-ui/config @neshel-ui/layout @neshel-ui/typography @neshel-ui/components"
                  lang="bash"
                  themes={{
                    light: "github-light-high-contrast",
                    dark: "github-dark-high-contrast",
                  }}
                  codeblock={{ className: "my-0" }}
                />
              </Stack>
            </Stack>
            <Center>
              <CanonicalLogo width={420} alt={`Neshel-UI — ${tagline}`} />
            </Center>
          </Grid>

          {/* Interactive demonstration */}
          <Grid columns={{ base: 1, lg: 2 }} space="10" alignY="center">
            <HomeDemo
              labels={{
                theme: t.demoTheme,
                title: t.demoTitle,
                description: t.demoDescription,
                open: t.demoOpen,
                body: t.demoBody,
                close: t.demoClose,
              }}
            />
            <Stack space="4">
              <Heading as="h2" size="2xl">
                {t.demoTitle}
              </Heading>
              <Paragraph tone="muted" measure="comfortable">
                {t.featureThemeText}
              </Paragraph>
              <ServerCodeBlock
                code={`<section data-neshel-theme="evergreen">\n  <Button>Primary</Button>\n</section>`}
                lang="tsx"
                themes={{ light: "github-light-high-contrast", dark: "github-dark-high-contrast" }}
                codeblock={{ className: "my-0" }}
              />
            </Stack>
          </Grid>

          {/* Principles and showcases */}
          <Grid columns={{ base: 1, md: 2, xl: 3 }} space="6">
            {features.map((feature) => (
              <Card key={feature.title} as="article">
                <CardHeader>
                  <CardTitle as="h2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Stack space="4" alignX="start">
                    <Paragraph size="sm" tone="muted">
                      {feature.text}
                    </Paragraph>
                    <Button asChild variant="link" size="sm">
                      <Link href={feature.href}>{t.openDocs} →</Link>
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            <Card as="article" variant="muted">
              <CardHeader>
                <CardTitle as="h2">{t.statusTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <Stack space="4" alignX="start">
                  <Paragraph size="sm" tone="muted">
                    {t.statusText}
                  </Paragraph>
                  <Button asChild variant="link" size="sm">
                    <Link href={`${docs}/project/release-status/`}>{t.statusLink} →</Link>
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Stack>
      </Container>
    </div>
  );
}
