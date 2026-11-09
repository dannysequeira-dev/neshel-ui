"use client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Label,
  Select,
} from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import { useState } from "react";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "pear", label: "Pear" },
];

/** Client island inside a named-theme scope: a controlled Select and a portalled Dialog. */
export function Island() {
  const [fruit, setFruit] = useState<string | null>(null);
  return (
    <Stack space="3">
      <Label htmlFor="fruit">Fruit</Label>
      <Select id="fruit" name="fruit" options={fruits} value={fruit} onValueChange={setFruit} />
      <output id="fruit-value">{fruit ?? "none"}</output>
      <Dialog>
        <DialogTrigger asChild>
          <Button id="open-dialog">Open dialog</Button>
        </DialogTrigger>
        <DialogContent id="dialog-content">
          <DialogTitle>Themed dialog</DialogTitle>
          <DialogDescription>Rendered in a portal with the harbor theme.</DialogDescription>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
