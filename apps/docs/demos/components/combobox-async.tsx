"use client";
import { Combobox, Label } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { Text } from "@neshel-ui/typography";
import { useEffect, useState } from "react";

const catalogue = [
  { value: "ts", label: "TypeScript" },
  { value: "rs", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "py", label: "Python" },
  { value: "kt", label: "Kotlin" },
  { value: "sw", label: "Swift" },
];

/** External filtering: the application owns the items (here a simulated request). */
export default function ComboboxAsync() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(catalogue);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setItems(catalogue.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())));
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Stack space="2" className="max-w-md">
      <Label htmlFor="combobox-async">Technologies (server search)</Label>
      <Combobox
        id="combobox-async"
        multiple
        items={items}
        filter={null}
        loading={loading}
        inputValue={query}
        onInputValueChange={setQuery}
        value={value}
        onValueChange={setValue}
        placeholder="Type to search"
      />
      <Text tone="muted" size="sm">
        value: {JSON.stringify(value)}
      </Text>
    </Stack>
  );
}
