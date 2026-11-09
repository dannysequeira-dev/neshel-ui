import { Button } from "@neshel-ui/components";
import { Center, Stack } from "@neshel-ui/layout";
import { Heading, Paragraph } from "@neshel-ui/typography";

/** Centered content: an empty state centred on both axes inside a fixed-height region. */
export default function CenterBasic() {
  return (
    <Center className="min-h-56 rounded-lg border border-dashed border-[var(--neshel-border)]">
      <Stack space="3" alignX="center">
        <Heading as="h3" size="lg">
          No projects yet
        </Heading>
        <Paragraph tone="muted" size="sm">
          Create your first project to get started.
        </Paragraph>
        <Button size="sm">New project</Button>
      </Stack>
    </Center>
  );
}
