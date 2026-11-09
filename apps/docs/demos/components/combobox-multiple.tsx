import { Combobox, Label } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";

const technologies = [
  { value: "ts", label: "TypeScript" },
  { value: "rs", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "py", label: "Python" },
  { value: "kt", label: "Kotlin" },
];

export default function ComboboxMultiple() {
  return (
    <Stack space="2" className="max-w-md">
      <Label htmlFor="combobox-tech">Technologies</Label>
      <Combobox
        id="combobox-tech"
        name="technologies"
        multiple
        items={technologies}
        defaultValue={["ts"]}
        placeholder="Select technologies"
      />
    </Stack>
  );
}
