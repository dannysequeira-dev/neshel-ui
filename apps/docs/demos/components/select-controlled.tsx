"use client";
import { Label, Select } from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { Text } from "@neshel-ui/typography";
import { useState } from "react";

const plans = [
  { value: "free", label: "Free" },
  { value: "team", label: "Team" },
  { value: "enterprise", label: "Enterprise" },
];

export default function SelectControlled() {
  const [plan, setPlan] = useState<string | null>("team");
  return (
    <Stack space="2" className="max-w-sm">
      <Label htmlFor="select-plan">Plan</Label>
      <Select id="select-plan" options={plans} value={plan} onValueChange={setPlan} />
      <Text tone="muted" size="sm">
        value: {String(plan)}
      </Text>
    </Stack>
  );
}
