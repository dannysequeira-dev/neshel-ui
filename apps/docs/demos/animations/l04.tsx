"use client";
import { LayoutGroup, LayoutItem } from "@neshel-ui/animations/layout";
import { useState } from "react";

export default function L04Example() {
  const [selected, setSelected] = useState(0);
  return (
    <LayoutGroup>
      <div className="flex w-fit gap-1 rounded-full bg-neshel-muted p-1">
        {["Free", "Pro", "Team"].map((plan, index) => (
          <button
            key={plan}
            type="button"
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            className="relative rounded-full px-5 py-2"
          >
            {selected === index ? (
              <LayoutItem
                layoutId="docs-plan"
                className="absolute inset-0 rounded-full bg-neshel-surface shadow"
              />
            ) : null}
            <span className="relative">{plan}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}
