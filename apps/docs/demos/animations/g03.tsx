"use client";
import "@neshel-ui/animations/gestures.css";
import { SwipeDismiss } from "@neshel-ui/animations/gestures";
import { useState } from "react";

export default function G03Example() {
  const [notes, setNotes] = useState(["Build passed", "New comment", "Deploy ready"]);
  return (
    <div className="grid max-w-sm gap-2">
      {notes.map((note) => (
        <SwipeDismiss
          key={note}
          direction="x"
          onDismiss={() => setNotes((all) => all.filter((item) => item !== note))}
          className="rounded-lg bg-neshel-muted p-4 pe-12"
        >
          {note}
        </SwipeDismiss>
      ))}
      {notes.length === 0 ? <p>Nothing left.</p> : null}
    </div>
  );
}
