import { Input, Label } from "@neshel-ui/components";
import { Inline, Stack } from "@neshel-ui/layout";
import { Caption } from "@neshel-ui/typography";

export default function InputStates() {
  return (
    <Stack space="5" className="max-w-sm">
      <Stack space="2">
        <Label htmlFor="demo-email" required>
          Email
        </Label>
        <Input
          id="demo-email"
          type="email"
          autoComplete="email"
          placeholder="ana@example.com"
          required
        />
      </Stack>
      <Stack space="2">
        <Label htmlFor="demo-username">Username</Label>
        <Input
          id="demo-username"
          invalid
          aria-describedby="demo-username-error"
          defaultValue="ana!"
        />
        <Caption id="demo-username-error" tone="destructive">
          Use letters and numbers only.
        </Caption>
      </Stack>
      <Inline space="2">
        <Input aria-label="Small field" uiSize="sm" placeholder="sm" />
        <Input aria-label="Large field" uiSize="lg" placeholder="lg" />
      </Inline>
      <Input aria-label="Disabled field" disabled defaultValue="Disabled" />
    </Stack>
  );
}
