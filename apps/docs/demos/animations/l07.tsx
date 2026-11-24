"use client";
import "@neshel-ui/animations/layout.css";
import { TabIndicator } from "@neshel-ui/animations/layout";
import { useState } from "react";

const tabs = ["Overview", "Specs", "Reviews"];

export default function L07Example() {
  const [active, setActive] = useState(0);
  return (
    <div>
      <TabIndicator asChild active={active}>
        <div
          role="tablist"
          aria-label="Product"
          className="flex gap-1 border-b border-neshel-border text-neshel-foreground"
        >
          {tabs.map((tab, index) => (
            <button
              key={tab}
              id={`docs-l07-${index}`}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-controls="docs-l07-panel"
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              className="px-4 py-2"
            >
              {tab}
            </button>
          ))}
        </div>
      </TabIndicator>
      <div
        role="tabpanel"
        id="docs-l07-panel"
        aria-labelledby={`docs-l07-${active}`}
        className="p-4"
      >
        {tabs[active]}
      </div>
    </div>
  );
}
