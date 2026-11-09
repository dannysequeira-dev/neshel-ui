import { Grid, Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";

const outline = "outline outline-1 outline-dashed outline-[var(--neshel-accent)]";

/**
 * Left: trimmed (default) — the boxes start at the cap height and end at the baseline, so the
 * 16px gap is the visible gap. Right: trim={false} keeps the font's internal leading.
 */
export default function CapsizeTrim() {
  return (
    <Grid columns={{ base: 1, md: 2 }} space="8">
      <Stack space="4">
        <Heading as="h3" size="2xl" className={outline}>
          Trimmed heading
        </Heading>
        <Paragraph className={outline}>Trimmed paragraph with Capsize.</Paragraph>
      </Stack>
      <Stack space="4">
        <Heading as="h3" size="2xl" trim={false} className={outline}>
          Untrimmed heading
        </Heading>
        <Paragraph trim={false} className={outline}>
          Untrimmed paragraph.
        </Paragraph>
      </Stack>
    </Grid>
  );
}
