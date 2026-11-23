import { Button, createToaster, Label, Switch, Toaster } from "@neshel-ui/components";
import { Inline, Stack } from "@neshel-ui/layout";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useMemo, useRef, useState } from "react";

const meta = {
  title: "Components/Forms & Feedback/Switch, Toast",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          'Feature 017. Switch: a native `<button role="switch" aria-checked>` with a hidden input for forms (`name`, `value` default "on", `required`, reset); Space toggles, `<Label htmlFor>` toggles; `uiSize` like Input/Select; focus-visible, forced colours, reduced motion. Toast: `createToaster()` returns a framework-free store (no provider); `<Toaster>` renders it with polite/assertive regions that exist before any toast, announces each toast once, pauses timers on hover/focus/hidden page, F8 moves focus to the toasts and Escape closes the focused one. Tones: neutral, success, warning, error. Optional motion layer: `@neshel-ui/animations` F06 with `motion="none"`.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Switches: Story = {
  render: function Switches() {
    const [on, setOn] = useState(true);
    return (
      <Stack space="3">
        <Inline space="2" alignY="center">
          <Switch id="sb-emails" />
          <Label htmlFor="sb-emails">Email updates (uncontrolled)</Label>
        </Inline>
        <Inline space="2" alignY="center">
          <Switch id="sb-controlled" checked={on} onCheckedChange={setOn} />
          <Label htmlFor="sb-controlled">Controlled: {on ? "on" : "off"}</Label>
        </Inline>
        <Inline space="2" alignY="center">
          <Switch id="sb-sm" uiSize="sm" defaultChecked />
          <Label htmlFor="sb-sm">Small</Label>
          <Switch id="sb-lg" uiSize="lg" />
          <Label htmlFor="sb-lg">Large</Label>
        </Inline>
        <Inline space="2" alignY="center">
          <Switch id="sb-disabled" disabled defaultChecked />
          <Label htmlFor="sb-disabled">Disabled</Label>
          <Switch id="sb-invalid" invalid aria-describedby="sb-invalid-msg" />
          <Label htmlFor="sb-invalid">Invalid</Label>
          <span id="sb-invalid-msg">Required to continue.</span>
        </Inline>
      </Stack>
    );
  },
};

export const SwitchInAForm: Story = {
  render: function SwitchInAForm() {
    const [data, setData] = useState("");
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setData(JSON.stringify([...new FormData(event.currentTarget).entries()]));
        }}
      >
        <Stack space="3">
          <Inline space="2" alignY="center">
            <Switch id="sb-news" name="news" />
            <Label htmlFor="sb-news">Newsletter</Label>
          </Inline>
          <Inline space="2" alignY="center">
            <Switch id="sb-terms" name="terms" required />
            <Label htmlFor="sb-terms" required>
              Accept terms
            </Label>
          </Inline>
          <Inline space="2">
            <Button type="submit" size="sm">
              Submit
            </Button>
            <Button type="reset" size="sm" variant="outline">
              Reset
            </Button>
          </Inline>
          <output>{data}</output>
        </Stack>
      </form>
    );
  },
};

export const Toasts: Story = {
  render: function Toasts() {
    const toaster = useMemo(() => createToaster({ max: 3 }), []);
    useEffect(() => () => toaster.destroy(), [toaster]);
    return (
      <Inline space="2">
        <Button
          variant="outline"
          onClick={() => toaster.show({ title: "Draft saved", description: "Version 3 stored" })}
        >
          Neutral
        </Button>
        <Button
          variant="outline"
          onClick={() => toaster.show({ title: "Payment received", tone: "success" })}
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() => toaster.show({ title: "Storage almost full", tone: "warning" })}
        >
          Warning
        </Button>
        <Button
          variant="outline"
          onClick={() => toaster.show({ title: "Upload failed", tone: "error" })}
        >
          Error
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toaster.show({
              title: "Message archived",
              action: { label: "Undo", onAction: () => toaster.show({ title: "Restored" }) },
            })
          }
        >
          With action (persistent)
        </Button>
        <Button variant="ghost" onClick={() => toaster.dismissAll()}>
          Dismiss all
        </Button>
        <Toaster toaster={toaster} />
      </Inline>
    );
  },
};

export const QueuedToasts: Story = {
  render: function QueuedToasts() {
    const toaster = useMemo(() => createToaster({ max: 1, overflow: "queue" }), []);
    const count = useRef(0);
    useEffect(() => () => toaster.destroy(), [toaster]);
    return (
      <Inline space="2">
        <Button
          variant="outline"
          onClick={() => toaster.show({ title: `Step ${++count.current} done`, duration: 2500 })}
        >
          Queue a toast (one visible at a time)
        </Button>
        <Toaster toaster={toaster} placement="top-end" />
      </Inline>
    );
  },
};
