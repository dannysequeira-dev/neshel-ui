import { Button } from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";

export default function ButtonVariants() {
  return (
    <Inline space="3" align="center" wrap>
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="link">Link</Button>
    </Inline>
  );
}
