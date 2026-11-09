"use client";
import {
  Button,
  Combobox,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { useState } from "react";

const assignees = [
  { value: "ana", label: "Ana Rojas" },
  { value: "luis", label: "Luis Mora" },
  { value: "mei", label: "Mei Tanaka" },
  { value: "sam", label: "Sam Ortiz" },
];

/** A Combobox inside a Popover: Escape closes the listbox first, then the popover. */
export default function PopoverCombobox() {
  const [assignee, setAssignee] = useState<string | null>(null);
  const name = assignees.find((item) => item.value === assignee)?.label;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">{name ? `Assigned to ${name}` : "Assign"}</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Stack space="2" className="w-64">
          <Label htmlFor="popover-assignee">Assignee</Label>
          <Combobox
            id="popover-assignee"
            items={assignees}
            value={assignee}
            onValueChange={setAssignee}
            placeholder="Search people"
          />
        </Stack>
      </PopoverContent>
    </Popover>
  );
}
