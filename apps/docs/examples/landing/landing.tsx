import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MobileMenu,
  MobileMenuContent,
  MobileMenuLink,
  MobileMenuNav,
  MobileMenuTrigger,
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarNav,
} from "@neshel-ui/components";
import { Center, Container, Flex, Grid, Inline, Stack } from "@neshel-ui/layout";
import { Caption, Heading, Paragraph, Text } from "@neshel-ui/typography";
import { Leaf, Sprout, Sun } from "lucide-react";

const links = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#contact", label: "Contact" },
];

const features = [
  { icon: Sprout, title: "Plan the season", text: "Schedule sowing and harvests for every plot." },
  { icon: Sun, title: "Track the weather", text: "Local forecasts and frost alerts in one place." },
  { icon: Leaf, title: "Share the harvest", text: "Coordinate pick-ups with your community." },
];

/**
 * A public landing page for a fictional product, in the "evergreen" named theme generated from
 * this site's neshel.config.ts — a different identity built with the same components.
 * No client-side state: this module renders as a Server Component.
 */
export function Landing() {
  return (
    <div
      data-neshel-theme="evergreen"
      className="bg-[var(--neshel-background)] text-[var(--neshel-foreground)]"
    >
      <Navbar>
        <NavbarBrand asChild>
          <a href="#top">
            <Leaf aria-hidden="true" /> Greenfield
          </a>
        </NavbarBrand>
        <NavbarNav hideBelow="md" aria-label="Landing">
          {links.map((link) => (
            <NavbarLink key={link.href} href={link.href}>
              {link.label}
            </NavbarLink>
          ))}
        </NavbarNav>
        <NavbarActions>
          <Button size="sm">Start free</Button>
          <MobileMenu breakpoint="md">
            <MobileMenuTrigger />
            <MobileMenuContent>
              <MobileMenuNav aria-label="Landing">
                {links.map((link) => (
                  <MobileMenuLink key={link.href} href={link.href}>
                    {link.label}
                  </MobileMenuLink>
                ))}
              </MobileMenuNav>
            </MobileMenuContent>
          </MobileMenu>
        </NavbarActions>
      </Navbar>

      <Container size="lg" gutter={{ base: "4", md: "8" }}>
        <Stack space={{ base: "16", md: "24" }} className="py-16">
          <Flex
            id="top"
            direction={{ base: "column", lg: "row" }}
            space={{ base: "8", lg: "12" }}
            alignY="center"
          >
            <Stack space="6" alignX={{ base: "center", lg: "start" }} className="flex-1">
              <Badge variant="accent">New: community harvest boards</Badge>
              <Heading
                as="h1"
                size={{ base: "3xl", md: "5xl" }}
                align={{ base: "center", lg: "start" }}
                wrap="balance"
              >
                Grow more with less guesswork
              </Heading>
              <Paragraph
                size={{ base: "base", md: "lg" }}
                tone="muted"
                measure="comfortable"
                align={{ base: "center", lg: "start" }}
              >
                Greenfield helps community gardens plan, track and share every season — on any
                device.
              </Paragraph>
              <Inline space="3" wrap>
                <Button size="lg">Start free</Button>
                <Button size="lg" variant="outline">
                  See a demo
                </Button>
              </Inline>
            </Stack>
            <Center className="aspect-[4/3] w-full flex-1 rounded-2xl bg-[var(--neshel-muted)]">
              <Text tone="muted">Product screenshot</Text>
            </Center>
          </Flex>

          <Stack id="features" space="8">
            <Heading as="h2" size="2xl" align="center">
              Everything a garden needs
            </Heading>
            <Grid columns={{ base: 1, md: 3 }} space="6">
              {features.map(({ icon: Icon, title, text }) => (
                <Card key={title} as="article">
                  <CardHeader>
                    <Icon aria-hidden="true" />
                    <CardTitle>{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Paragraph size="sm" tone="muted">
                      {text}
                    </Paragraph>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </Stack>

          <Center id="pricing">
            <Stack space="4" alignX="center" className="max-w-xl text-center">
              <Heading as="h2" size="2xl">
                Free for community gardens
              </Heading>
              <Paragraph tone="muted">
                Paid plans for farms and schools start at $9/month.
              </Paragraph>
              <Button>Create your garden</Button>
              <Caption>No credit card required.</Caption>
            </Stack>
          </Center>
        </Stack>
      </Container>
    </div>
  );
}
