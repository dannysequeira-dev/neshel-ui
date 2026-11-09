import { Stack } from "@neshel-ui/layout";
import { Caption, Paragraph } from "@neshel-ui/typography";

export default function CaptionFigure() {
  return (
    <Stack as="figure" space="2" className="m-0">
      <div
        className="h-24 rounded-lg bg-[var(--neshel-muted)]"
        role="img"
        aria-label="Revenue chart placeholder"
      />
      <Caption asChild>
        <figcaption>Figure 1 — Monthly revenue, last twelve months.</figcaption>
      </Caption>
      <Paragraph size="sm">
        <Caption as="span" tone="default">
          Updated
        </Caption>{" "}
        a few minutes ago.
      </Paragraph>
    </Stack>
  );
}
