"use client";
import { Button, Label, Switch } from "@neshel-ui/components";
import { useState } from "react";

export default function SwitchForm() {
  const [data, setData] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setData(JSON.stringify([...new FormData(event.currentTarget).entries()]));
      }}
      style={{ display: "grid", gap: 12, justifyItems: "start" }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Switch id="demo-news" name="news" />
        <Label htmlFor="demo-news">Newsletter</Label>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Switch id="demo-terms" name="terms" required />
        <Label htmlFor="demo-terms" required>
          Accept terms
        </Label>
      </div>
      <Button type="submit" size="sm">
        Save
      </Button>
      <output>{data}</output>
    </form>
  );
}
