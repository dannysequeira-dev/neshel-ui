import { Label, Select, type SelectOptions } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { Caption } from "@neshel-ui/typography";

const countries: SelectOptions = [
  { value: "cr", label: "Costa Rica" },
  { value: "es", label: "Spain" },
  { value: "jp", label: "Japan" },
  { value: "ca", label: "Canada", disabled: true },
];

const languages: SelectOptions = [
  {
    label: "Europe",
    options: [
      { value: "es", label: "Spanish" },
      { value: "fr", label: "French" },
    ],
  },
  {
    label: "Asia",
    options: [
      { value: "ja", label: "Japanese" },
      { value: "ko", label: "Korean" },
    ],
  },
];

export default function SelectBasic() {
  return (
    <Stack space="5" className="max-w-sm">
      <Stack space="2">
        <Label htmlFor="select-country">Country</Label>
        <Select
          id="select-country"
          name="country"
          options={countries}
          placeholder="Select a country"
        />
      </Stack>
      <Stack space="2">
        <Label htmlFor="select-language">Language (grouped)</Label>
        <Select id="select-language" name="language" options={languages} defaultValue="fr" />
      </Stack>
      <Stack space="2">
        <Label htmlFor="select-required">Region</Label>
        <Select
          id="select-required"
          options={countries}
          invalid
          aria-describedby="select-required-error"
          placeholder="Required"
        />
        <Caption id="select-required-error" tone="destructive">
          Choose a region.
        </Caption>
      </Stack>
    </Stack>
  );
}
