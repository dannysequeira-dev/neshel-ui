import { Separator } from "@neshel-ui/components";
import { Inline, Stack } from "@neshel-ui/layout";
import { Paragraph, Text } from "@neshel-ui/typography";

export default function SeparatorBasic() {
  return (
    <Stack space="4">
      <Paragraph>Profile settings</Paragraph>
      {/* Semantic: a thematic break that assistive technology announces. */}
      <Separator />
      <Inline space="3" alignY="stretch" className="h-6">
        <Text>Docs</Text>
        {/* Decorative: purely visual, hidden from assistive technology. */}
        <Separator orientation="vertical" decorative />
        <Text>Blog</Text>
      </Inline>
    </Stack>
  );
}
