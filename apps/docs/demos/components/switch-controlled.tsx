"use client";
import { Label, Switch } from "@neshel-ui/components";
import { useState } from "react";

export default function SwitchControlled() {
  const [enabled, setEnabled] = useState(true);
  return (
    <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Switch
          id="demo-sync"
          uiSize="lg"
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-describedby="demo-sync-hint"
        />
        <Label htmlFor="demo-sync">Synchronise files</Label>
      </div>
      <p id="demo-sync-hint">
        {enabled ? "Files are synchronised." : "Synchronisation is paused."}
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Switch id="demo-locked" checked readOnly uiSize="sm" />
        <Label htmlFor="demo-locked">Managed by your organisation</Label>
      </div>
    </div>
  );
}
