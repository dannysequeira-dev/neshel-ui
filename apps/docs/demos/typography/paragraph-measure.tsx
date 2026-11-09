import { Stack } from "@neshel-ui/layout";
import { Paragraph } from "@neshel-ui/typography";

const text =
  "Beautiful typography begins with precision: a readable line length, generous leading and a type scale that keeps its rhythm across breakpoints.";

export default function ParagraphMeasure() {
  return (
    <Stack space="5">
      <Paragraph measure="narrow">narrow (45ch) — {text}</Paragraph>
      <Paragraph measure="comfortable" leading="relaxed" wrap="pretty">
        comfortable (65ch), relaxed leading, pretty wrapping — {text}
      </Paragraph>
      <Paragraph truncate className="max-w-sm" tone="muted">
        truncate — {text}
      </Paragraph>
    </Stack>
  );
}
