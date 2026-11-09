"use client";
import { Label, Select } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { useState } from "react";

const options = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "harbor", label: "Harbor (named theme)" },
];

/** Client component: sets data-neshel-theme on <html> and remembers it in a cookie. */
export function ThemeSwitcher({ initial }: { initial: string }) {
  const [theme, setTheme] = useState<string | null>(initial);
  return (
    <Stack space="2" className="max-w-xs">
      <Label htmlFor="theme">Theme</Label>
      <Select
        id="theme"
        options={options}
        value={theme}
        onValueChange={(value) => {
          const next = value ?? "system";
          setTheme(next);
          document.documentElement.dataset.neshelTheme = next;
          document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
        }}
      />
    </Stack>
  );
}
