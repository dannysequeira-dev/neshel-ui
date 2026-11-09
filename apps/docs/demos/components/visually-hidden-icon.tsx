import { Button, VisuallyHidden } from "@neshel-ui/components";
import { Inline } from "@neshel-ui/layout";
import { Bell } from "lucide-react";

export default function VisuallyHiddenIcon() {
  return (
    <Inline space="3" align="center">
      <Button variant="outline">
        <Bell aria-hidden="true" />
        <VisuallyHidden>Notifications</VisuallyHidden>
        <span aria-hidden="true">3</span>
        <VisuallyHidden>(3 unread)</VisuallyHidden>
      </Button>
    </Inline>
  );
}
