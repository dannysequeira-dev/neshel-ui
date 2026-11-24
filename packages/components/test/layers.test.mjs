// K-15 (feature 017): Escape ownership across nested Neshel layers. Radix DismissableLayer (1.2.x)
// attaches its Escape listener only to the layer that was highest at its last render and refreshes
// that render asynchronously (`dismissableLayer.update` -> force()). These tests open layers outside
// act() and press Escape inside that window, deterministically, before React's scheduler runs.
import assert from "node:assert/strict";
import test from "node:test";
import { StrictMode, useState } from "react";
import { mount as baseMount, click, h, key, ui } from "./helpers.mjs";

const views = new Set();
async function mount(element) {
  const view = await baseMount(element);
  const unmount = view.unmount;
  view.unmount = async () => {
    if (!views.delete(view)) return;
    await unmount();
  };
  views.add(view);
  return view;
}
test.afterEach(async () => {
  for (const view of [...views]) await view.unmount();
});

const {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} = ui;

const dialogs = () => document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length;
const active = () => document.activeElement?.id || document.activeElement?.tagName;

/** Let the discrete render, its synchronous passive effects and microtasks run — not the scheduler. */
async function microtasks() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

/** Run `fn` with React's act() environment off, so React schedules work as in a browser. */
async function outsideAct(fn) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    return await fn();
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  }
}

/** Wait for React's scheduler (macrotasks) to settle. */
async function settle() {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => setTimeout(resolve, 5));
}

/** Radix FocusScope restores focus in a setTimeout(0) on unmount: wait for that state (bounded). */
async function focusOn(id) {
  for (let i = 0; i < 50 && active() !== id; i++) await new Promise((r) => setTimeout(r, 10));
  return active();
}

function pressEscape(target = document.activeElement ?? document.body) {
  const event = new window.KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function rawClick(target) {
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
    const Ctor = type.startsWith("pointer") ? window.PointerEvent : window.MouseEvent;
    target.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, button: 0 }));
  }
}

function silenceWarnings() {
  const original = console.error;
  const originalWarn = console.warn;
  console.error = (...args) => {
    if (/Missing `Description`|aria-describedby/.test(String(args[0]))) return;
    original(...args);
  };
  console.warn = (...args) => {
    if (/Missing `Description`|aria-describedby/.test(String(args[0]))) return;
    originalWarn(...args);
  };
  return () => {
    console.error = original;
    console.warn = originalWarn;
  };
}

function nestedDialogs({ outer = {}, inner = {}, onOuterEscape, onInnerEscape } = {}) {
  return h(
    Dialog,
    outer,
    h(DialogTrigger, { id: "outer-trigger" }, "Open"),
    h(
      DialogContent,
      { onEscapeKeyDown: onOuterEscape },
      h(DialogTitle, null, "Outer"),
      h("input", { id: "outer-field", "aria-label": "Outer field" }),
      h(
        Dialog,
        inner,
        h(DialogTrigger, { id: "nested-trigger" }, "Nested"),
        h(
          DialogContent,
          { onEscapeKeyDown: onInnerEscape },
          h(DialogTitle, null, "Nested"),
          h("button", { id: "nested-field", type: "button" }, "Inside"),
        ),
      ),
    ),
  );
}

async function openNestedFast(view) {
  await click(view.container.querySelector("#outer-trigger"));
  assert.equal(dialogs(), 1, "outer open");
  await outsideAct(async () => {
    rawClick(document.querySelector("#nested-trigger"));
    await microtasks();
  });
  assert.equal(dialogs(), 2, "nested open before the scheduler ran");
}

test("K-15: Escape right after a nested dialog opens closes only the nested dialog", async () => {
  const restore = silenceWarnings();
  const view = await mount(nestedDialogs());
  await openNestedFast(view);
  await outsideAct(async () => {
    pressEscape();
    await settle();
  });
  assert.equal(dialogs(), 1, `only the nested dialog closes (dialogs=${dialogs()})`);
  assert.equal(
    await focusOn("nested-trigger"),
    "nested-trigger",
    "focus returns to the nested trigger",
  );
  await outsideAct(async () => {
    pressEscape();
    await settle();
  });
  assert.equal(dialogs(), 0, "second Escape closes the outer dialog");
  assert.equal(
    await focusOn("outer-trigger"),
    "outer-trigger",
    "focus returns to the outer trigger",
  );
  await view.unmount();
  restore();
});

test("K-15: consumer onEscapeKeyDown runs once, on the topmost layer only", async () => {
  const restore = silenceWarnings();
  const calls = [];
  const view = await mount(
    nestedDialogs({
      onOuterEscape: () => calls.push("outer"),
      onInnerEscape: () => calls.push("inner"),
    }),
  );
  await openNestedFast(view);
  await outsideAct(async () => {
    pressEscape();
    await settle();
  });
  assert.deepEqual(calls, ["inner"], `handlers ${JSON.stringify(calls)}`);
  await view.unmount();
  restore();
});

test("K-15: preventDefault in the topmost onEscapeKeyDown keeps every layer open", async () => {
  const restore = silenceWarnings();
  const view = await mount(nestedDialogs({ onInnerEscape: (event) => event.preventDefault() }));
  await openNestedFast(view);
  await outsideAct(async () => {
    pressEscape();
    await settle();
  });
  assert.equal(dialogs(), 2, "nothing closes when the top layer prevents Escape");
  await view.unmount();
  restore();
});

test("K-15: rapid sequential Escapes close one layer each, in order", async () => {
  const restore = silenceWarnings();
  const view = await mount(nestedDialogs());
  await openNestedFast(view);
  await outsideAct(async () => {
    pressEscape();
    await microtasks();
    assert.equal(dialogs(), 1, `first Escape closed only the nested dialog (${dialogs()})`);
    // Second Escape before Radix re-registered the outer layer's listener.
    pressEscape();
    await settle();
  });
  assert.equal(dialogs(), 0, "second rapid Escape closes the outer dialog");
  await view.unmount();
  restore();
});

test("K-15: steady state (after the scheduler) still closes one layer per Escape", async () => {
  const restore = silenceWarnings();
  const view = await mount(nestedDialogs());
  await click(view.container.querySelector("#outer-trigger"));
  await click(document.querySelector("#nested-trigger"));
  assert.equal(dialogs(), 2);
  await key(document.activeElement, "Escape");
  assert.equal(dialogs(), 1);
  assert.equal(await focusOn("nested-trigger"), "nested-trigger");
  await key(document.activeElement, "Escape");
  assert.equal(dialogs(), 0);
  assert.equal(await focusOn("outer-trigger"), "outer-trigger");
  await view.unmount();
  restore();
});

function ControlledOuter({ changes }) {
  const [open, setOpen] = useState(false);
  return nestedDialogs({
    outer: {
      open,
      onOpenChange: (next) => {
        changes.push(next);
        setOpen(next);
      },
    },
  });
}

test("K-15: controlled outer + uncontrolled nested, under StrictMode", async () => {
  const restore = silenceWarnings();
  const changes = [];
  const view = await mount(h(StrictMode, null, h(ControlledOuter, { changes })));
  await openNestedFast(view);
  await outsideAct(async () => {
    pressEscape();
    await settle();
  });
  assert.equal(dialogs(), 1, `only nested closed (${dialogs()})`);
  assert.deepEqual(changes, [true], "outer onOpenChange not called by the nested Escape");
  await outsideAct(async () => {
    pressEscape();
    await settle();
  });
  assert.equal(dialogs(), 0);
  assert.deepEqual(changes, [true, false]);
  await view.unmount();
  restore();
});

test("K-15: both layers open on mount (defaultOpen) — the deeper layer owns Escape", async () => {
  const restore = silenceWarnings();
  // Both layers mount in one commit: effects run child-first, so registration order alone would
  // rank the outer layer above the nested one.
  const view = await mount(
    h(
      StrictMode,
      null,
      nestedDialogs({ outer: { defaultOpen: true }, inner: { defaultOpen: true } }),
    ),
  );
  assert.equal(dialogs(), 2);
  await outsideAct(async () => {
    pressEscape();
    await settle();
  });
  assert.equal(dialogs(), 1, `only the nested dialog closed (${dialogs()})`);
  assert.ok(document.querySelector("#outer-field"), "outer dialog still open");
  await view.unmount();
  restore();
});

test("K-15: AlertDialog and Sheet nested in a Dialog, Popover in a Dialog", async () => {
  const restore = silenceWarnings();
  const cases = [
    [
      "alert",
      h(
        AlertDialog,
        null,
        h(AlertDialogTrigger, { id: "nested-trigger" }, "Delete"),
        h(
          AlertDialogContent,
          null,
          h(AlertDialogTitle, null, "Sure?"),
          h(AlertDialogCancel, { id: "nested-field" }, "Cancel"),
        ),
      ),
    ],
    [
      "sheet",
      h(
        Sheet,
        null,
        h(SheetTrigger, { id: "nested-trigger" }, "Sheet"),
        h(SheetContent, null, h(SheetTitle, null, "S"), h("button", { id: "nested-field" }, "x")),
      ),
    ],
    [
      "popover",
      h(
        Popover,
        null,
        h(PopoverTrigger, { id: "nested-trigger" }, "Pop"),
        h(PopoverContent, { id: "popover-content" }, h("button", { id: "nested-field" }, "x")),
      ),
    ],
  ];
  for (const [name, nested] of cases) {
    const view = await mount(
      h(
        Dialog,
        null,
        h(DialogTrigger, { id: "outer-trigger" }, "Open"),
        h(DialogContent, null, h(DialogTitle, null, "Outer"), nested),
      ),
    );
    await click(view.container.querySelector("#outer-trigger"));
    const open = () =>
      name === "popover" ? !!document.querySelector("#popover-content") : dialogs() === 2;
    await outsideAct(async () => {
      rawClick(document.querySelector("#nested-trigger"));
      await microtasks();
    });
    assert.ok(open(), `${name}: nested layer open`);
    await outsideAct(async () => {
      pressEscape();
      await settle();
    });
    assert.ok(!open(), `${name}: nested layer closed`);
    assert.equal(
      document.querySelectorAll('[role="dialog"]').length,
      1,
      `${name}: outer dialog stays open`,
    );
    await view.unmount();
  }
  restore();
});

test("K-15: unmounting while the nested dialog is open leaves no Escape owner behind", async () => {
  const restore = silenceWarnings();
  const view = await mount(nestedDialogs());
  await openNestedFast(view);
  await view.unmount();
  const event = await outsideAct(async () => {
    const e = pressEscape(document.body);
    await settle();
    return e;
  });
  assert.equal(event.defaultPrevented, false, "a stale Neshel layer consumed a later Escape");
  assert.equal(dialogs(), 0);
  restore();
});
