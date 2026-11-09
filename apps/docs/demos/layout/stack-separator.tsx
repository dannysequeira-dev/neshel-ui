import { Inline, Stack } from "@neshel-ui/layout";
import { Text } from "@neshel-ui/typography";

const items = ["Profile", "Security", "Notifications"];

export default function StackSeparator() {
  return (
    <Stack space="6">
      {/* true: a decorative rule between items; inside a <ul> it is rendered as an <li>. */}
      <Stack as="ul" space="3" separator>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Stack>
      {/* A custom separator element is inserted unchanged between items. */}
      <Inline as="nav" aria-label="Footer" space="3" separator={<Text aria-hidden="true">·</Text>}>
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
        <a href="#contact">Contact</a>
      </Inline>
    </Stack>
  );
}
