"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
} from "@neshel-ui/components";
import { useState } from "react";

const sections = ["Profile", "Billing", "Security"];

export default function AccordionMultiple() {
  const [open, setOpen] = useState<string[]>(["Profile"]);
  return (
    <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
      <Button variant="outline" onClick={() => setOpen(open.length ? [] : sections)}>
        {open.length ? "Close all" : "Open all"}
      </Button>
      <Accordion
        type="multiple"
        value={open}
        onValueChange={setOpen}
        style={{ width: "100%", maxWidth: 520 }}
      >
        {sections.map((name) => (
          <AccordionItem key={name} value={name}>
            <AccordionTrigger>{name}</AccordionTrigger>
            <AccordionContent>{name} settings.</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
