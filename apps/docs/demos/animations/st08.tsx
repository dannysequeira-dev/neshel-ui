"use client";
import { useSectionSpy } from "@neshel-ui/animations/scroll";
import { useState } from "react";

const ids = ["spy-intro", "spy-usage", "spy-limits"];

export default function ST08Example() {
  const [source, setSource] = useState<HTMLElement | null>(null);
  const active = useSectionSpy(ids, { source });
  return (
    <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
      <nav aria-label="Sections of the example" className="grid content-start gap-1">
        {ids.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? "location" : undefined}
            className="aria-[current]:font-bold"
          >
            {id.slice(4)}
          </a>
        ))}
      </nav>
      <section
        ref={setSource}
        aria-label="Scrollable sections"
        tabIndex={0}
        className="relative h-48 overflow-y-auto rounded-xl border border-neshel-border"
      >
        {ids.map((id) => (
          <div key={id} id={id} className="h-40 p-4">
            Section {id.slice(4)}
          </div>
        ))}
      </section>
    </div>
  );
}
