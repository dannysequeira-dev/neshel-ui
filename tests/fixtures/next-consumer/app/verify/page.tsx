// Overlay added to the next-app starter by `pnpm check:next` (feature 006, R8/R10).
// A Server Component page: no "use client" here. Presentational components render on the
// server; the interactive island and overlays are client components inside the package.
import { Button, Card, CardContent, CardHeader, CardTitle } from "@neshel-ui/components";
import { Container, Grid, Stack } from "@neshel-ui/layout";
import { Caption, Heading, Paragraph } from "@neshel-ui/typography";
import { Island } from "./island";

export const dynamic = "force-dynamic";

export default function VerifyPage() {
  return (
    <Container id="container" size="md" gutter="4">
      <Stack space="6">
        <Heading as="h1" id="server-heading" size={{ base: "xl", tablet: "3xl" }}>
          Server-rendered heading
        </Heading>
        <Paragraph id="server-paragraph">Rendered by a React Server Component.</Paragraph>
        <Grid id="bp-grid" columns={{ base: 1, phoneXL: 2, laptop: 3, wide: 4 }} space="2">
          <Card>
            <CardHeader>
              <CardTitle>One</CardTitle>
            </CardHeader>
            <CardContent>
              <Caption>Card</Caption>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Two</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Three</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Four</CardTitle>
            </CardHeader>
          </Card>
        </Grid>
        <Button id="server-button" size={{ base: "sm", laptop: "lg" }}>
          Server button
        </Button>
        <section id="harbor-scope" data-neshel-theme="harbor">
          <Island />
        </section>
      </Stack>
    </Container>
  );
}
