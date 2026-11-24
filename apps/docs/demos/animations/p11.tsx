"use client";
import "@neshel-ui/animations/press.css";
import { LongPress } from "@neshel-ui/animations/press";
import { Button } from "@neshel-ui/components";
import { useState } from "react";

export default function P11Example() {
  const [archived, setArchived] = useState(false);
  return (
    <div className="flex items-center gap-4">
      <LongPress onLongPress={() => setArchived(true)} duration={800} asChild>
        <Button variant="outline">Hold to archive</Button>
      </LongPress>
      <output>{archived ? "Archived" : "Not archived"}</output>
    </div>
  );
}
