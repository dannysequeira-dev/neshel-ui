// Replace mode (FR-008, SC-003) shared with @neshel-ui/layout through @neshel-ui/config.
import { Heading, Paragraph } from "../../src/index.js";

export const ok = (
  <Heading as="h1" size={{ base: "lg", phone: "xl", tablet: "3xl", laptop: "4xl", wide: "5xl" }}>
    <Paragraph align={{ base: "center", laptop: "start" }}>Text</Paragraph>
  </Heading>
);

// @ts-expect-error "md" is not configured in replace mode
export const obsolete = <Heading size={{ base: "lg", md: "xl" }} />;

// @ts-expect-error unknown name
export const typo = <Paragraph weight={{ tablett: "bold" }} />;
