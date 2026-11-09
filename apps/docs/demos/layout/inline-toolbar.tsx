import { Badge, Button } from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";

export default function InlineToolbar() {
  return (
    <Inline space="3" justify="between" align="center" wrap>
      <Inline space="2" wrap>
        <Badge>Draft</Badge>
        <Badge variant="outline">Design</Badge>
        <Badge variant="outline">Docs</Badge>
      </Inline>
      <Inline space="2">
        <Button size="sm" variant="ghost">
          Preview
        </Button>
        <Button size="sm">Publish</Button>
      </Inline>
    </Inline>
  );
}
