import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  createToaster,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Label,
  Switch,
  Toaster,
} from "@neshel-ui/components";
import { useState } from "react";

/** Feature 017 demo: Accordion, Collapsible, Switch and Toast from @neshel-ui/components (no provider). */
const toaster = createToaster({ max: 3 });

type Theme = "light" | "dark";

export function ComponentsDemo() {
  const [theme, setTheme] = useState<Theme>("light");
  const [faq, setFaq] = useState<string[]>(["install"]);
  const [details, setDetails] = useState(false);
  const [alerts, setAlerts] = useState(true);
  const [form, setForm] = useState("");
  return (
    <main
      data-neshel-theme={theme}
      className="min-h-screen bg-neshel-background p-8 font-neshel-body text-neshel-foreground"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Components — feature 017</h1>
          <div className="flex items-center gap-2">
            <Switch
              id="demo-theme"
              checked={theme === "dark"}
              onCheckedChange={(dark) => setTheme(dark ? "dark" : "light")}
            />
            <Label htmlFor="demo-theme">Dark theme</Label>
          </div>
        </header>

        <section aria-labelledby="demo-accordion" className="flex flex-col gap-3">
          <h2 id="demo-accordion" className="text-lg font-semibold">
            Accordion
          </h2>
          <p className="text-sm">Uncontrolled, single, collapsible (one item disabled):</p>
          <Accordion collapsible defaultValue="a" headingLevel={3}>
            <AccordionItem value="a">
              <AccordionTrigger>What is Neshel-UI?</AccordionTrigger>
              <AccordionContent>A small, modular, accessible React design system.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="b" disabled>
              <AccordionTrigger>Is there a paid plan?</AccordionTrigger>
              <AccordionContent>Not yet.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>Does it need Tailwind?</AccordionTrigger>
              <AccordionContent>No: the stylesheet is precompiled.</AccordionContent>
            </AccordionItem>
          </Accordion>
          <p className="text-sm">Controlled, multiple — open: {faq.join(", ") || "none"}</p>
          <Accordion type="multiple" value={faq} onValueChange={setFaq} headingLevel={3}>
            <AccordionItem value="install">
              <AccordionTrigger>Install</AccordionTrigger>
              <AccordionContent>pnpm add @neshel-ui/components</AccordionContent>
            </AccordionItem>
            <AccordionItem value="theme">
              <AccordionTrigger>Theme</AccordionTrigger>
              <AccordionContent>Override semantic tokens; no provider needed.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section aria-labelledby="demo-collapsible" className="flex flex-col gap-3">
          <h2 id="demo-collapsible" className="text-lg font-semibold">
            Collapsible
          </h2>
          <Collapsible>
            <CollapsibleTrigger>Show details (uncontrolled)</CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-sm">Details rendered only while open.</p>
            </CollapsibleContent>
          </Collapsible>
          <Collapsible open={details} onOpenChange={setDetails}>
            <CollapsibleTrigger>
              {details ? "Hide" : "Show"} filters (controlled)
            </CollapsibleTrigger>
            <CollapsibleContent keepMounted>
              <p className="text-sm">Kept in the DOM while closed.</p>
            </CollapsibleContent>
          </Collapsible>
        </section>

        <section aria-labelledby="demo-switch" className="flex flex-col gap-3">
          <h2 id="demo-switch" className="text-lg font-semibold">
            Switch
          </h2>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setForm(JSON.stringify([...new FormData(event.currentTarget).entries()]));
            }}
          >
            <div className="flex items-center gap-2">
              <Switch id="demo-news" name="news" />
              <Label htmlFor="demo-news">Newsletter (uncontrolled)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="demo-alerts" name="alerts" checked={alerts} onCheckedChange={setAlerts} />
              <Label htmlFor="demo-alerts">Alerts (controlled: {alerts ? "on" : "off"})</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="demo-terms" name="terms" required />
              <Label htmlFor="demo-terms" required>
                Accept terms
              </Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Submit
              </Button>
              <Button type="reset" size="sm" variant="outline">
                Reset
              </Button>
            </div>
            <output className="text-sm">{form}</output>
          </form>
        </section>

        <section aria-labelledby="demo-toast" className="flex flex-col gap-3">
          <h2 id="demo-toast" className="text-lg font-semibold">
            Toast
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => toaster.show({ title: "Draft saved" })}>
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
              With action
            </Button>
          </div>
          <p className="text-sm">F8 moves focus to the toasts; Escape closes the focused one.</p>
        </section>

        <section aria-labelledby="demo-nested" className="flex flex-col gap-3">
          <h2 id="demo-nested" className="text-lg font-semibold">
            Nested dialogs (K-15)
          </h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Outer dialog</DialogTitle>
              <DialogDescription>Escape closes one layer at a time.</DialogDescription>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open nested</Button>
                </DialogTrigger>
                <DialogContent aria-describedby={undefined} size="sm">
                  <DialogTitle>Nested dialog</DialogTitle>
                  <DialogClose asChild>
                    <Button>Done</Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>
            </DialogContent>
          </Dialog>
        </section>
      </div>
      <Toaster toaster={toaster} />
    </main>
  );
}
