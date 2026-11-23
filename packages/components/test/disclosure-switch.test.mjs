// Feature 017 — Accordion, Collapsible and Switch (contracts/disclosure-api.md, contracts/switch-api.md):
// SSR markup and hydration, ARIA wiring, keyboard, controlled/uncontrolled, collapsible, disabled, forms,
// asChild, StrictMode cleanup. Real-input keyboard/axe checks run in browsers (check:browsers).
import assert from "node:assert/strict";
import test from "node:test";
import { act, StrictMode, useState } from "react";
import { click, h, key, markup, mount, renderToString, ui } from "./helpers.mjs";

const {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Label,
  Switch,
} = ui;

function faq(props = {}, items = ["one", "two", "three"], extra = {}) {
  return h(
    Accordion,
    props,
    items.map((value) =>
      h(
        AccordionItem,
        { key: value, value, disabled: extra.disabled === value },
        h(AccordionTrigger, { id: `t-${value}` }, `Question ${value}`),
        h(AccordionContent, { id: `c-${value}` }, `Answer ${value}`),
      ),
    ),
  );
}

const trigger = (value) => document.getElementById(`t-${value}`);
const expanded = (value) => trigger(value).getAttribute("aria-expanded");
const openValues = (items = ["one", "two", "three"]) =>
  items.filter((value) => expanded(value) === "true");

async function hydrate(element) {
  const html = renderToString(element);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(String(args[0]));
  const { hydrateRoot } = await import("react-dom/client");
  let root;
  await act(async () => {
    root = hydrateRoot(container, element);
  });
  console.error = original;
  return {
    container,
    errors,
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

// --- Accordion ---------------------------------------------------------------------------------------------

test("Accordion · SSR: headings wrap buttons with aria-expanded/aria-controls; open panel rendered", () => {
  const html = markup(faq({ defaultValue: "two", headingLevel: 2 }));
  assert.match(html, /class="neshel-accordion"/);
  assert.equal((html.match(/<h2[^>]*class="neshel-accordion-header"/g) ?? []).length, 3);
  assert.match(
    html,
    /<button[^>]*aria-expanded="false"[^>]*id="t-one"|<button[^>]*id="t-one"[^>]*aria-expanded="false"/,
  );
  assert.match(html, /Answer two/, "the initially open panel is server-rendered");
  assert.doesNotMatch(html, /Answer one/, "closed panels are not mounted by default");
});

test("Accordion · hydration without warnings; initial state visible before hydration", async () => {
  const view = await hydrate(faq({ type: "multiple", defaultValue: ["one", "three"] }));
  assert.deepEqual(view.errors, [], "hydration mismatch");
  assert.deepEqual(openValues(), ["one", "three"]);
  const button = trigger("one");
  const panel = document.getElementById(button.getAttribute("aria-controls"));
  assert.ok(panel?.textContent.includes("Answer one"), "aria-controls points at the panel");
  await view.unmount();
});

test("Accordion · single (default): one open; not collapsible keeps it open; collapsible closes it", async () => {
  const changes = [];
  const view = await mount(faq({ onValueChange: (v) => changes.push(v) }));
  await click(trigger("one"));
  assert.deepEqual(openValues(), ["one"]);
  await click(trigger("two"));
  assert.deepEqual(openValues(), ["two"], "opening another closes the first");
  await click(trigger("two"));
  assert.deepEqual(openValues(), ["two"], "not collapsible: stays open");
  assert.deepEqual(changes, ["one", "two"]);
  await view.unmount();
  const collapsible = await mount(faq({ collapsible: true, defaultValue: "one" }));
  await click(trigger("one"));
  assert.deepEqual(openValues(), [], "collapsible: closes");
  await collapsible.unmount();
});

test("Accordion · multiple: several open; onValueChange gets the list", async () => {
  const changes = [];
  const view = await mount(faq({ type: "multiple", onValueChange: (v) => changes.push(v) }));
  await click(trigger("one"));
  await click(trigger("three"));
  assert.deepEqual(openValues(), ["one", "three"]);
  assert.deepEqual(changes.at(-1), ["one", "three"]);
  await click(trigger("one"));
  assert.deepEqual(changes.at(-1), ["three"]);
  await view.unmount();
});

function ControlledFaq({ log }) {
  const [value, setValue] = useState("one");
  return h(
    "div",
    null,
    h("button", { id: "external", type: "button", onClick: () => setValue("three") }, "Open three"),
    faq({
      value,
      onValueChange: (next) => {
        log.push(next);
        setValue(next);
      },
    }),
  );
}

test("Accordion · controlled (StrictMode): external value wins; user changes go through onValueChange", async () => {
  const log = [];
  const view = await mount(h(StrictMode, null, h(ControlledFaq, { log })));
  assert.deepEqual(openValues(), ["one"]);
  await click(document.getElementById("external"));
  assert.deepEqual(openValues(), ["three"]);
  await click(trigger("two"));
  assert.deepEqual(log, ["two"]);
  assert.deepEqual(openValues(), ["two"]);
  await view.unmount();
});

test("Accordion · keyboard: arrows, Home/End move between headers; disabled items are skipped and inert", async () => {
  const view = await mount(faq({}, ["one", "two", "three"], { disabled: "two" }));
  trigger("one").focus();
  await key(trigger("one"), "ArrowDown");
  assert.equal(document.activeElement, trigger("three"), "disabled header skipped");
  await key(trigger("three"), "ArrowDown");
  assert.equal(document.activeElement, trigger("one"), "wraps around");
  await key(trigger("one"), "End");
  assert.equal(document.activeElement, trigger("three"));
  await key(trigger("three"), "Home");
  assert.equal(document.activeElement, trigger("one"));
  await key(trigger("one"), "ArrowUp");
  assert.equal(document.activeElement, trigger("three"));
  await click(trigger("two"));
  assert.equal(expanded("two"), "false", "a disabled item does not toggle");
  await view.unmount();
});

function Nested() {
  const [items, setItems] = useState(["a", "b"]);
  return h(
    Accordion,
    { type: "multiple", defaultValue: ["outer"] },
    h(
      AccordionItem,
      { value: "outer" },
      h(AccordionTrigger, { id: "t-outer" }, "Outer"),
      h(
        AccordionContent,
        null,
        h("button", { id: "add", type: "button", onClick: () => setItems([...items, "c"]) }, "Add"),
        faq({}, items),
      ),
    ),
    h(AccordionItem, { value: "last" }, h(AccordionTrigger, { id: "t-last" }, "Last")),
  );
}

test("Accordion · nested accordions keep their own arrow navigation; dynamic items", async () => {
  const view = await mount(h(Nested));
  trigger("a").focus();
  await key(trigger("a"), "End");
  assert.equal(document.activeElement, trigger("b"), "End stays inside the nested accordion");
  await click(document.getElementById("add"));
  await key(trigger("b"), "ArrowDown");
  assert.equal(
    document.activeElement,
    trigger("c"),
    "a dynamically added item joins the navigation",
  );
  trigger("outer").focus();
  await key(trigger("outer"), "ArrowDown");
  assert.equal(document.activeElement, trigger("last"), "outer navigation skips nested headers");
  await view.unmount();
});

test("Accordion · keepMounted keeps closed panels hidden in the DOM; asChild trigger", async () => {
  const view = await mount(
    h(
      Accordion,
      { keepMounted: true },
      h(
        AccordionItem,
        { value: "x" },
        h(
          AccordionTrigger,
          { asChild: true },
          h("button", { id: "custom", type: "button" }, "Custom"),
        ),
        h(AccordionContent, { id: "c-x" }, "Kept"),
      ),
    ),
  );
  const custom = document.getElementById("custom");
  assert.equal(custom.getAttribute("aria-expanded"), "false");
  assert.ok(custom.closest("h3"), "asChild trigger still inside the heading");
  const panel = document.getElementById("c-x");
  assert.ok(panel, "closed panel kept in the DOM");
  assert.ok(panel.hidden || panel.hasAttribute("hidden"), "and hidden");
  await click(custom);
  assert.equal(custom.getAttribute("aria-expanded"), "true");
  await view.unmount();
});

test("Accordion · invalid props are reported", () => {
  assert.throws(() => markup(h(Accordion, { type: "many" })), /Accordion.*type/);
  assert.throws(() => markup(h(Accordion, { headingLevel: 1 })), /headingLevel/);
  assert.throws(
    () => markup(h(Accordion, null, h(AccordionItem, { value: "" }))),
    /AccordionItem.*value/,
  );
  assert.throws(
    () =>
      markup(
        h(
          Accordion,
          null,
          h(AccordionItem, { value: "a" }, h(AccordionTrigger, { asChild: true }, "text")),
        ),
      ),
    /AccordionTrigger.*asChild/,
  );
});

test("Accordion · inside a Dialog: header keys do not leak to the dialog; Escape closes the dialog", async () => {
  const view = await mount(
    h(
      Dialog,
      null,
      h(DialogTrigger, { id: "open" }, "Open"),
      h(DialogContent, null, h(DialogTitle, null, "Settings"), faq({ defaultValue: "one" })),
    ),
  );
  await click(document.getElementById("open"));
  trigger("one").focus();
  await key(trigger("one"), "ArrowDown");
  assert.equal(document.activeElement, trigger("two"));
  assert.ok(document.querySelector('[role="dialog"]'), "dialog still open");
  await key(document.activeElement, "Escape");
  assert.equal(document.querySelector('[role="dialog"]'), null);
  await view.unmount();
});

// --- Collapsible -------------------------------------------------------------------------------------------

function details(props = {}, content = {}) {
  return h(
    Collapsible,
    props,
    h(CollapsibleTrigger, { id: "toggle" }, "Show more"),
    h(CollapsibleContent, { id: "more", ...content }, "More content"),
  );
}

test("Collapsible · SSR and hydration: trigger state and initial panel; no warnings", async () => {
  const closed = markup(details());
  assert.match(closed, /aria-expanded="false"/);
  assert.doesNotMatch(closed, /More content/);
  const view = await hydrate(details({ defaultOpen: true }));
  assert.deepEqual(view.errors, []);
  const toggle = document.getElementById("toggle");
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.equal(toggle.getAttribute("aria-controls"), document.getElementById("more").id);
  await view.unmount();
});

test("Collapsible · uncontrolled toggle by click and keyboard; disabled ignores input", async () => {
  const changes = [];
  const view = await mount(details({ onOpenChange: (open) => changes.push(open) }));
  const toggle = document.getElementById("toggle");
  assert.equal(toggle.tagName, "BUTTON");
  await click(toggle);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  assert.ok(document.getElementById("more"));
  await click(toggle);
  assert.equal(document.getElementById("more"), null, "unmounted when closed (default)");
  assert.deepEqual(changes, [true, false]);
  await view.unmount();
  const disabled = await mount(details({ disabled: true }));
  await click(document.getElementById("toggle"));
  assert.equal(document.getElementById("toggle").getAttribute("aria-expanded"), "false");
  await disabled.unmount();
});

function ControlledDetails({ log }) {
  const [open, setOpen] = useState(false);
  return h(
    "div",
    null,
    h("button", { id: "ext", type: "button", onClick: () => setOpen(true) }, "Open"),
    details({
      open,
      onOpenChange: (next) => {
        log.push(next);
        setOpen(next);
      },
    }),
  );
}

test("Collapsible · controlled (StrictMode), keepMounted keeps the panel hidden, asChild trigger", async () => {
  const log = [];
  const view = await mount(h(StrictMode, null, h(ControlledDetails, { log })));
  await click(document.getElementById("ext"));
  assert.equal(document.getElementById("toggle").getAttribute("aria-expanded"), "true");
  await click(document.getElementById("toggle"));
  assert.deepEqual(log, [false]);
  await view.unmount();
  const kept = await mount(
    h(
      Collapsible,
      null,
      h(CollapsibleTrigger, { asChild: true }, h("button", { id: "own", type: "button" }, "Own")),
      h(CollapsibleContent, { id: "kept", keepMounted: true }, "Kept"),
    ),
  );
  const panel = document.getElementById("kept");
  assert.ok(panel && (panel.hidden || panel.hasAttribute("hidden")), "kept and hidden");
  assert.equal(document.getElementById("own").getAttribute("aria-expanded"), "false");
  await kept.unmount();
});

// --- Switch ------------------------------------------------------------------------------------------------

test("Switch · SSR: native button role=switch, aria-checked, size class; hydration clean", async () => {
  const html = markup(h(Switch, { id: "emails", defaultChecked: true, uiSize: "lg" }));
  assert.match(html, /<button[^>]*role="switch"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /neshel-switch-size-lg/);
  const view = await hydrate(
    h(
      "div",
      null,
      h(Label, { htmlFor: "emails" }, "Emails"),
      h(Switch, { id: "emails", name: "emails" }),
    ),
  );
  assert.deepEqual(view.errors, []);
  await view.unmount();
});

test("Switch · click, Space and Label toggle it; controlled and uncontrolled; disabled/readOnly ignore input", async () => {
  const changes = [];
  const view = await mount(
    h(
      "div",
      null,
      h(Label, { htmlFor: "s1" }, "Receive emails"),
      h(Switch, { id: "s1", onCheckedChange: (c) => changes.push(c) }),
      h(Switch, { id: "s2", disabled: true }),
      h(Switch, { id: "s3", readOnly: true }),
    ),
  );
  const s1 = document.getElementById("s1");
  assert.equal(s1.getAttribute("role"), "switch");
  assert.equal(s1.getAttribute("aria-checked"), "false");
  await click(s1);
  assert.equal(s1.getAttribute("aria-checked"), "true");
  await click(view.container.querySelector("label"));
  assert.equal(s1.getAttribute("aria-checked"), "false", "the label toggles its switch");
  // Space/Enter activate the native <button> in a browser (jsdom does not synthesise the click):
  // verified with real keyboard input by check:browsers (switch-keyboard-and-form).
  assert.deepEqual(changes, [true, false]);
  await click(document.getElementById("s2"));
  assert.equal(document.getElementById("s2").getAttribute("aria-checked"), "false");
  await click(document.getElementById("s3"));
  assert.equal(document.getElementById("s3").getAttribute("aria-checked"), "false");
  await view.unmount();
});

function ControlledSwitch({ log }) {
  const [on, setOn] = useState(true);
  return h(Switch, {
    id: "ctl",
    checked: on,
    onCheckedChange: (next) => {
      log.push(next);
      setOn(next);
    },
  });
}

test("Switch · controlled (StrictMode)", async () => {
  const log = [];
  const view = await mount(h(StrictMode, null, h(ControlledSwitch, { log })));
  const s = document.getElementById("ctl");
  assert.equal(s.getAttribute("aria-checked"), "true");
  await click(s);
  assert.equal(s.getAttribute("aria-checked"), "false");
  assert.deepEqual(log, [false]);
  await view.unmount();
});

test("Switch · forms: name=value only while on; custom value; required validity; reset restores", async () => {
  const view = await mount(
    h(
      "form",
      { id: "f" },
      h(Switch, { id: "news", name: "news" }),
      h(Switch, { id: "plan", name: "plan", value: "pro", defaultChecked: true }),
      h(Switch, { id: "terms", name: "terms", required: true }),
    ),
  );
  const form = document.getElementById("f");
  const data = () => [...new FormData(form).entries()].map(([k, v]) => `${k}=${v}`);
  assert.deepEqual(data(), ["plan=pro"]);
  await click(document.getElementById("news"));
  assert.deepEqual(data(), ["news=on", "plan=pro"]);
  assert.equal(form.checkValidity(), false, "required switch off blocks submission");
  await click(document.getElementById("terms"));
  assert.equal(form.checkValidity(), true);
  await act(async () => form.reset());
  await act(async () => {});
  assert.equal(
    document.getElementById("news").getAttribute("aria-checked"),
    "false",
    "reset restores",
  );
  await view.unmount();
});

test("Switch · invalid uiSize is reported; aria-invalid", () => {
  assert.throws(() => markup(h(Switch, { uiSize: "xl" })), /Switch.*uiSize/);
  assert.match(markup(h(Switch, { invalid: true })), /aria-invalid="true"/);
});
