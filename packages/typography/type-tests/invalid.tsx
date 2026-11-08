// Negative type fixtures: each `@ts-expect-error` must be needed (`pnpm typecheck`).
import { Caption, Heading, Paragraph, Text } from "../src/index.js";

export function Invalid() {
  return (
    <>
      {/* @ts-expect-error headings render h1–h6 only */}
      <Heading as="p" />
      {/* @ts-expect-error as + asChild */}
      <Heading as="h1" asChild>
        <span />
      </Heading>
      {/* @ts-expect-error unknown size */}
      <Paragraph size="7xl" />
      {/* @ts-expect-error unknown weight */}
      <Text weight="black" />
      {/* @ts-expect-error tone is static */}
      <Text tone={{ base: "muted" }} />
      {/* @ts-expect-error unknown tone (accent has no contrast pair) */}
      <Text tone="accent" />
      {/* @ts-expect-error tablet is not a default breakpoint */}
      <Heading size={{ base: "lg", tablet: "xl" }} />
      {/* @ts-expect-error Text is never trimmed */}
      <Text trim />
      {/* @ts-expect-error Caption elements are closed */}
      <Caption as="h2" />
      {/* @ts-expect-error unknown family role */}
      <Paragraph family="serif" />
      {/* @ts-expect-error color is not a typography prop (use tone) */}
      <Text color="red" />
    </>
  );
}
