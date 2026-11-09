import { Input, Label } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";

export default function LabelField() {
  return (
    <Stack space="2" className="max-w-sm">
      {/* htmlFor ties the label to the control: clicking it focuses the input. */}
      <Label htmlFor="demo-full-name" required>
        Full name
      </Label>
      <Input id="demo-full-name" name="fullName" autoComplete="name" required />
    </Stack>
  );
}
