"use client";
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@neshel-ui/components";
import { useState } from "react";

export default function CollapsibleControlled() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline">{open ? "Hide filters" : "Show filters"}</Button>
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <p style={{ paddingTop: 12 }}>The filters keep their values while hidden.</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
