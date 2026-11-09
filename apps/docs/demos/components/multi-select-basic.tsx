"use client";
import { Label, MultiSelect } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { Text } from "@neshel-ui/typography";
import { useState } from "react";

const languages = [
  { value: "es", label: "Spanish" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
];

export default function MultiSelectBasic() {
  const [value, setValue] = useState<string[]>(["es", "ja"]);
  return (
    <Stack space="5" className="max-w-md">
      <Stack space="2">
        <Label htmlFor="multi-languages">Languages</Label>
        <MultiSelect
          id="multi-languages"
          name="languages"
          options={languages}
          value={value}
          onValueChange={setValue}
          placeholder="Select languages"
        />
        <Text tone="muted" size="sm">
          value: {JSON.stringify(value)}
        </Text>
      </Stack>
      <Stack space="2">
        <Label htmlFor="multi-summary">Summary only (no chips)</Label>
        <MultiSelect id="multi-summary" options={languages} chips={false} defaultValue={["fr"]} />
      </Stack>
    </Stack>
  );
}
