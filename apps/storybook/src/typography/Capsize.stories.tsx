import { Grid, Inline, Stack } from "@neshel-ui/layout";
import { Caption, Heading, Paragraph, Text } from "@neshel-ui/typography";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";

const meta = {
  title: "Typography/Capsize",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Capsize trims the space above the cap height and below the baseline using the font's real metrics (`neshel.config.ts` → `typography.metrics`). The outline shows each element's box: trimmed boxes hug the capitals and the baseline, so a layout gap is the true visual gap. The default metrics are Inter's; if Inter is not installed the browser renders a fallback and the trims are approximate (configure your font's metrics and Capsize fallbacks).",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const outline: CSSProperties = { outline: "1px dashed var(--neshel-accent)" };
const Column = ({ title, children }: { title: string; children: ReactNode }) => (
  <Stack space="4">
    <Text weight="semibold" size="sm" tone="muted">
      {title}
    </Text>
    {children}
  </Stack>
);

export const TrimmedVersusUntrimmed: Story = {
  render: () => (
    <Grid columns={{ base: 1, tablet: 2 }} space="8">
      <Column title="trim (default)">
        <Heading as="h2" size="4xl" style={outline}>
          Hxg Capsize
        </Heading>
        <Paragraph style={outline}>
          The box starts at the cap height and ends at the baseline.
        </Paragraph>
      </Column>
      <Column title="trim={false}">
        <Heading as="h2" size="4xl" trim={false} style={outline}>
          Hxg Capsize
        </Heading>
        <Paragraph trim={false} style={outline}>
          The box includes the font's ascent, descent and half-leading.
        </Paragraph>
      </Column>
    </Grid>
  ),
};

export const PreciseGaps: Story = {
  name: "Gaps equal the visual space",
  render: () => (
    <Stack space="4" style={{ maxWidth: 520 }}>
      <Heading as="h2" size="2xl" style={outline}>
        Account
      </Heading>
      <Paragraph tone="muted" style={outline}>
        Manage your profile settings. The 1rem gap above is measured from the heading's baseline to
        this paragraph's cap height.
      </Paragraph>
      <Inline space="3" alignY="baseline">
        <Heading as="h3" size="lg" style={outline}>
          Overview
        </Heading>
        <Caption as="span" style={outline}>
          Updated recently
        </Caption>
      </Inline>
    </Stack>
  ),
};

export const LeadingDrivesTrimming: Story = {
  render: () => (
    <Grid columns={{ base: 1, phone: 2, lg: 3 }} space="6">
      {(["tight", "normal", "loose"] as const).map((leading) => (
        <Column key={leading} title={`leading="${leading}"`}>
          <Paragraph leading={leading} style={outline}>
            Multi-line text keeps its line boxes; only the first line's top and the last line's
            bottom are trimmed, whatever the leading.
          </Paragraph>
        </Column>
      ))}
    </Grid>
  ),
};

export const FontRoles: Story = {
  render: () => (
    <Stack space="5">
      <Paragraph family="body" size="xl" style={outline}>
        body — var(--neshel-font-body)
      </Paragraph>
      <Paragraph family="display" size="xl" style={outline}>
        display — var(--neshel-font-display)
      </Paragraph>
      <Paragraph family="mono" size="xl" style={outline}>
        mono — no default metrics: untrimmed, scale 1
      </Paragraph>
      <Caption>
        Each role carries its own metrics (--neshel-font-&lt;role&gt;-cap-trim, -baseline-trim,
        -scale); sizes are normalised to the same cap height across roles.
      </Caption>
    </Stack>
  ),
};
