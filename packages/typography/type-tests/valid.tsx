// Positive type fixtures (`pnpm typecheck`).
import { useRef } from "react";
import {
  Caption,
  Heading,
  type HeadingProps,
  Paragraph,
  type Responsive,
  Text,
  type TextSize,
} from "../src/index.js";

export function Valid() {
  const ref = useRef<HTMLElement>(null);
  const size: Responsive<TextSize> = { base: "xl", md: "3xl", "2xl": "5xl" };
  const spread: HeadingProps = { as: "h3", size: "2xl", weight: "bold", tone: "primary" };
  return (
    <>
      <Heading as="h1" size="2xl" weight="bold" tone="primary">
        Welcome to Neshel-UI
      </Heading>
      <Heading
        as="h1"
        size={{ base: "xl", md: "3xl", lg: "5xl" }}
        weight={{ base: "medium", md: "bold" }}
        align={{ base: "center", lg: "start" }}
        ref={ref}
      >
        Responsive
      </Heading>
      <Heading {...spread} size={size} trim={false} wrap="balance" />
      <Paragraph size="base" measure="comfortable" tone="muted" leading="relaxed">
        Beautiful typography begins with precision.
      </Paragraph>
      <Paragraph
        as="div"
        id="p"
        aria-label="x"
        onClick={() => undefined}
        style={{ color: "red" }}
      />
      <Caption as="figcaption" truncate>
        Caption
      </Caption>
      <Caption asChild>
        <figcaption>Figure</figcaption>
      </Caption>
      <Text asChild size="sm" weight="medium">
        <a href="/docs">Documentation</a>
      </Text>
      <Text as="code" family="mono" tracking="tight">
        code
      </Text>
      <Text className="x" data-test="t" />
    </>
  );
}
