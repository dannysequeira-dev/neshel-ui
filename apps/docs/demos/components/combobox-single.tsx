import { Combobox, Label } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";

const destinations = [
  {
    label: "Americas",
    items: [
      { value: "cr", label: "Costa Rica" },
      { value: "pe", label: "Peru" },
      { value: "ca", label: "Canada" },
    ],
  },
  {
    label: "Europe",
    items: [
      { value: "es", label: "Spain" },
      { value: "pt", label: "Portugal" },
    ],
  },
  {
    label: "Asia",
    items: [
      { value: "jp", label: "Japan" },
      { value: "vn", label: "Vietnam" },
    ],
  },
];

export default function ComboboxSingle() {
  return (
    <Stack space="2" className="max-w-sm">
      <Label htmlFor="combobox-destination">Destination</Label>
      <Combobox
        id="combobox-destination"
        name="destination"
        items={destinations}
        placeholder="Search a country"
      />
    </Stack>
  );
}
