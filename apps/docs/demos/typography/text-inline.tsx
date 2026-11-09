import { Paragraph, Text } from "@neshel-ui/typography";

/** Text styles inline phrases and inherits everything it does not set. */
export default function TextInline() {
  return (
    <Paragraph measure="comfortable">
      Run{" "}
      <Text as="code" family="mono" size="sm">
        neshel generate
      </Text>{" "}
      after editing the configuration. The command is{" "}
      <Text as="strong" weight="semibold">
        idempotent
      </Text>
      , and <Text tone="muted">unchanged output is never rewritten</Text>. Read the{" "}
      <Text asChild weight="medium" tone="primary">
        <a href="#cli">CLI reference</a>
      </Text>{" "}
      for details.
    </Paragraph>
  );
}
