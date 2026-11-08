import { Stack } from "@neshel-ui/layout";
import { Caption, Paragraph, Text } from "@neshel-ui/typography";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Frame } from "../layout/demo";

const meta = {
  title: "Typography/Text, Paragraph and Caption",
  component: Paragraph,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "`Paragraph` (`p`, trimmed), `Caption` (small supporting text, muted, trimmed) and `Text` (inline `span` that inherits everything it does not set; never trimmed). No margins: spacing comes from layout gaps.",
      },
    },
  },
  args: { children: "Beautiful typography begins with precision." },
} satisfies Meta<typeof Paragraph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ParagraphDefault: Story = {};

export const ParagraphMeasureAndLeading: Story = {
  render: () => (
    <Stack space="6">
      {(["narrow", "comfortable", "wide"] as const).map((measure) => (
        <Paragraph key={measure} measure={measure} leading="relaxed" tone="muted">
          Measure {measure}: comfortable line lengths keep long-form text readable. Neshel-UI is
          rooted in faith and built with hope, with care for every reader and every line.
        </Paragraph>
      ))}
    </Stack>
  ),
};

export const InlineText: Story = {
  render: () => (
    <Paragraph size="lg">
      Paragraph text with <Text weight="bold">bold</Text>, <Text tone="primary">primary</Text>,{" "}
      <Text as="code" family="mono" size="sm">
        code
      </Text>{" "}
      and an{" "}
      <Text asChild weight="medium" tone="primary">
        <a href="#docs">accessible link via asChild</a>
      </Text>
      .
    </Paragraph>
  ),
};

export const CaptionAsFigcaption: Story = {
  render: () => (
    <figure style={{ margin: 0 }}>
      <Frame style={{ height: 120 }}>Image</Frame>
      <Caption asChild>
        <figcaption>Figure 1 — Caption rendered as the figure's own figcaption.</figcaption>
      </Caption>
    </figure>
  ),
};

export const TruncateAndWrap: Story = {
  render: () => (
    <Stack space="4" style={{ width: 260 }}>
      <Paragraph truncate>
        A very long single line that is truncated with an ellipsis instead of wrapping.
      </Paragraph>
      <Paragraph wrap="pretty">
        Pretty wrapping avoids a lonely last word on the final line when the browser supports it.
      </Paragraph>
      <Caption>Truncation clips overflow, so Capsize trimming is removed automatically.</Caption>
    </Stack>
  ),
};

export const Multilingual: Story = {
  name: "Unicode and accents",
  render: () => (
    <Stack space="4">
      <Paragraph size="2xl">Ñandú, Ångström, Éclair — ÁÉÍÓÚ àèìòù</Paragraph>
      <Paragraph size="2xl" lang="ja">
        東京の空はとても青い
      </Paragraph>
      <Paragraph size="2xl" lang="th">
        กรุงเทพมหานคร
      </Paragraph>
      <Paragraph size="2xl" lang="ar" dir="rtl" align="start">
        مرحبا بالعالم
      </Paragraph>
      <Caption>
        Trimming uses negative margins, not clipping: accents and descenders stay visible.
      </Caption>
    </Stack>
  ),
};
