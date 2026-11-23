import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@neshel-ui/components";
import { Stack } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = {
  title: "Components/Disclosure/Accordion, Collapsible",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Feature 017, on Base UI (no new dependency). Accordion: headings (`headingLevel`, default 3) wrap native buttons with `aria-expanded`/`aria-controls`; `type` single (default; `collapsible` lets the open item close) or multiple; controlled (`value`/`onValueChange`) or uncontrolled (`defaultValue`); Enter/Space toggle, ArrowUp/ArrowDown/Home/End move between headers, disabled items are skipped. Collapsible: one trigger and one panel (`open`/`defaultOpen`/`onOpenChange`), not an accordion item. Both animate height optionally and stop under reduced motion; `keepMounted`/`hiddenUntilFound` keep closed content in the DOM. Use the theme toolbar for light/dark.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const questions = [
  [
    "install",
    "How do I install it?",
    "pnpm add @neshel-ui/components, then import its stylesheet.",
  ],
  [
    "tailwind",
    "Does it need Tailwind?",
    "No. The stylesheet is precompiled and works with plain CSS.",
  ],
  [
    "themes",
    "Can I use my own colours?",
    "Yes: every colour is a semantic token you can override.",
  ],
] as const;

export const SingleUncontrolled: Story = {
  render: () => (
    <Accordion collapsible defaultValue="install" style={{ maxWidth: 520 }}>
      {questions.map(([value, question, answer]) => (
        <AccordionItem key={value} value={value}>
          <AccordionTrigger>{question}</AccordionTrigger>
          <AccordionContent>{answer}</AccordionContent>
        </AccordionItem>
      ))}
      <AccordionItem value="pricing" disabled>
        <AccordionTrigger>Is there a paid plan? (disabled)</AccordionTrigger>
        <AccordionContent>Not yet.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const MultipleControlled: Story = {
  render: function MultipleControlled() {
    const [open, setOpen] = useState<string[]>(["install", "themes"]);
    return (
      <Stack space="3" style={{ maxWidth: 520 }}>
        <p>Open: {open.join(", ") || "none"}</p>
        <Accordion type="multiple" value={open} onValueChange={setOpen} headingLevel={2}>
          {questions.map(([value, question, answer]) => (
            <AccordionItem key={value} value={value}>
              <AccordionTrigger>{question}</AccordionTrigger>
              <AccordionContent>{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Stack>
    );
  },
};

export const CollapsibleUncontrolled: Story = {
  render: () => (
    <Collapsible style={{ maxWidth: 520 }}>
      <CollapsibleTrigger>Show release notes</CollapsibleTrigger>
      <CollapsibleContent>
        <p>Accordion, Collapsible, Switch and Toast join @neshel-ui/components.</p>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const CollapsibleControlled: Story = {
  render: function CollapsibleControlled() {
    const [open, setOpen] = useState(true);
    return (
      <Stack space="2" style={{ maxWidth: 520 }}>
        <p>State: {open ? "open" : "closed"}</p>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger>{open ? "Hide" : "Show"} filters</CollapsibleTrigger>
          <CollapsibleContent keepMounted>
            <p>Kept in the DOM while closed (hidden).</p>
          </CollapsibleContent>
        </Collapsible>
      </Stack>
    );
  },
};
