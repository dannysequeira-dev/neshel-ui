import { Combobox, Label, MultiSelect, Select } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

const meta = {
  title: "Components/Selection",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Base UI-powered Select, MultiSelect and Combobox with string values and native form serialisation (`name`). Label them with `id` + `<Label htmlFor>`. Combobox values are constrained to the items (use `<Input list>` for free text); `filter={null}` lets the application filter or load items. Escape closes the popup and never clears the selection.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const countries = [
  { value: "cr", label: "Costa Rica" },
  { value: "es", label: "Spain" },
  { value: "jp", label: "Japan" },
  { value: "mx", label: "Mexico", disabled: true },
];
const languages = [
  {
    label: "European",
    options: [
      { value: "es", label: "Spanish" },
      { value: "fr", label: "French" },
      { value: "pt", label: "Portuguese" },
    ],
  },
  { label: "Asian", options: [{ value: "ja", label: "Japanese" }] },
];
const technologies = [
  { value: "ts", label: "TypeScript" },
  { value: "rs", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "py", label: "Python" },
  { value: "kt", label: "Kotlin" },
];

const field = (id: string, label: string, control: React.ReactNode) => (
  <Stack space="1.5" style={{ maxWidth: 360 }}>
    <Label htmlFor={id}>{label}</Label>
    {control}
  </Stack>
);

export const SelectStates: Story = {
  render: () => (
    <Stack space="4">
      {field(
        "s-1",
        "Country",
        <Select id="s-1" options={countries} placeholder="Select a country" />,
      )}
      {field("s-2", "Language (groups)", <Select id="s-2" options={languages} defaultValue="fr" />)}
      {field(
        "s-3",
        "Invalid",
        <Select
          id="s-3"
          options={countries}
          invalid
          aria-describedby="s-3-error"
          placeholder="Required"
        />,
      )}
      <p id="s-3-error" style={{ margin: 0, color: "var(--neshel-destructive)" }}>
        Choose a country.
      </p>
      {field("s-4", "Disabled", <Select id="s-4" options={countries} disabled defaultValue="cr" />)}
    </Stack>
  ),
};

function ControlledSelect() {
  const [value, setValue] = useState<string | null>("es");
  return (
    <Stack space="2">
      {field(
        "s-c",
        "Controlled",
        <Select id="s-c" options={countries} value={value} onValueChange={setValue} />,
      )}
      <output>value: {String(value)}</output>
    </Stack>
  );
}
export const SelectControlled: Story = { render: () => <ControlledSelect /> };

export const MultiSelectChips: Story = {
  render: () =>
    field(
      "m-1",
      "Languages",
      <MultiSelect
        id="m-1"
        name="languages"
        options={languages}
        defaultValue={["es", "ja"]}
        placeholder="Select languages"
      />,
    ),
};

export const MultiSelectSummaryOnly: Story = {
  render: () =>
    field(
      "m-2",
      "Languages",
      <MultiSelect
        id="m-2"
        options={languages}
        chips={false}
        clearable={false}
        defaultValue={["fr"]}
      />,
    ),
};

export const ComboboxSingle: Story = {
  render: () =>
    field(
      "c-1",
      "Destination",
      <Combobox id="c-1" items={countries} placeholder="Search a country" />,
    ),
};

export const ComboboxMultiple: Story = {
  render: () =>
    field(
      "c-2",
      "Technologies",
      <Combobox
        id="c-2"
        multiple
        items={technologies}
        defaultValue={["ts"]}
        placeholder="Select technologies"
      />,
    ),
};

/** The application filters (simulated latency); selected chips keep their labels. */
function AsyncCombobox() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(technologies);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<string[]>([]);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setItems(technologies.filter((t) => t.label.toLowerCase().includes(query.toLowerCase())));
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <Stack space="2">
      {field(
        "c-3",
        "Technologies (external filtering)",
        <Combobox
          id="c-3"
          multiple
          items={items}
          filter={null}
          loading={loading}
          inputValue={query}
          onInputValueChange={setQuery}
          value={value}
          onValueChange={setValue}
          placeholder="Type to search"
        />,
      )}
      <output>value: {JSON.stringify(value)}</output>
    </Stack>
  );
}
export const ComboboxExternalFiltering: Story = { render: () => <AsyncCombobox /> };
