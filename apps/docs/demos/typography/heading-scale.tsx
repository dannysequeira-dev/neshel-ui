import { Stack } from "@neshel-ui/layout";
import { Heading } from "@neshel-ui/typography";

/** The element (as) sets semantics; the size sets the visual scale — they are independent. */
export default function HeadingScale() {
  return (
    <Stack space="4">
      <Heading as="h2" size="4xl">
        Heading h2, size 4xl
      </Heading>
      <Heading as="h3">Heading h3, default size (2xl)</Heading>
      <Heading as="h4" size="lg" weight="medium" tone="primary">
        Heading h4, size lg, medium, primary tone
      </Heading>
      <Heading as="h5" size="sm" tracking="wide">
        HEADING H5, SIZE SM, WIDE TRACKING
      </Heading>
    </Stack>
  );
}
