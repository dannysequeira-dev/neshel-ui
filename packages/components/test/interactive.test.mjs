// Overlays, selection, navigation and shell under jsdom: SSR markup, open/close state, titles,
// theme wrapper, forms, controlled/uncontrolled behaviour (FR-050–FR-110, FR-120). Real-input
// keyboard and focus behaviour is verified in Chrome by check:browser (FR-121).
import assert from "node:assert/strict";
import test from "node:test";
import { Fragment, useState } from "react";
import {
  click,
  firstElement,
  h,
  key,
  markup,
  mount,
  renderError,
  renderToString,
  ui,
} from "./helpers.mjs";

const {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  AppShell,
  AppShellContent,
  AppShellMain,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  MobileMenu,
  MobileMenuContent,
  MobileMenuLink,
  MobileMenuNav,
  MobileMenuTrigger,
  MultiSelect,
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarNav,
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarItem,
  SidebarSub,
  SidebarTrigger,
} = ui;

const options = [
  { value: "cr", label: "Costa Rica" },
  { value: "es", label: "Spain" },
  { label: "Other", options: [{ value: "jp", label: "Japan", disabled: true }] },
];

function silenceWarnings() {
  const original = console.warn;
  console.warn = () => {};
  return () => {
    console.warn = original;
  };
}

test("overlays render only their triggers on the server (SSR-safe, no portals)", () => {
  const html = renderToString(
    h(
      Fragment,
      null,
      h(
        Dialog,
        null,
        h(DialogTrigger, null, "Open"),
        h(DialogContent, null, h(DialogTitle, null, "T")),
      ),
      h(
        Sheet,
        null,
        h(SheetTrigger, null, "Sheet"),
        h(SheetContent, null, h(SheetTitle, null, "S")),
      ),
      h(Popover, null, h(PopoverTrigger, null, "Pop"), h(PopoverContent, null, "Body")),
    ),
  );
  assert.match(html, /aria-haspopup="dialog" aria-expanded="false"/);
  assert.doesNotMatch(html, /role="dialog"/);
});

test("Dialog: trigger opens, title/description wired, close button labelled, theme copied, Escape closes", async () => {
  const restore = silenceWarnings();
  const view = await mount(
    h(
      "section",
      { "data-neshel-theme": "sepia" },
      h(
        Dialog,
        null,
        h(DialogTrigger, { id: "open" }, "Edit profile"),
        h(
          DialogContent,
          null,
          h(DialogTitle, null, "Edit profile"),
          h(DialogDescription, null, "Update"),
          h("input", { "aria-label": "Name" }),
        ),
      ),
    ),
  );
  await click(view.container.querySelector("#open"));
  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog, "dialog opened");
  assert.equal(
    document.getElementById(dialog.getAttribute("aria-labelledby")).textContent,
    "Edit profile",
  );
  assert.equal(
    document.getElementById(dialog.getAttribute("aria-describedby")).textContent,
    "Update",
  );
  assert.ok(dialog.querySelector('button[aria-label="Close"]'));
  assert.equal(dialog.closest("[data-neshel-portal]").getAttribute("data-neshel-theme"), "sepia");
  assert.ok(dialog.classList.contains("neshel-dialog-size-md"));
  await key(dialog, "Escape");
  assert.equal(document.querySelector('[role="dialog"]'), null, "Escape closed the dialog");
  await view.unmount();
  restore();
});

function Controlled({ changes }) {
  const [open, setOpen] = useState(true);
  return h(
    Dialog,
    {
      open,
      onOpenChange: (next) => {
        changes.push(next);
        setOpen(next);
      },
    },
    h(DialogContent, { "aria-describedby": undefined }, h(DialogTitle, null, "Controlled")),
  );
}

test("Dialog: controlled open state follows props and reports changes", async () => {
  const changes = [];
  const view = await mount(h(Controlled, { changes }));
  assert.ok(document.querySelector('[role="dialog"]'));
  await click(document.querySelector('[role="dialog"] button[aria-label="Close"]'));
  assert.deepEqual(changes, [false]);
  assert.equal(document.querySelector('[role="dialog"]'), null);
  await view.unmount();
});

test("AlertDialog: alertdialog role, explicit Cancel/Action with button styles", async () => {
  const view = await mount(
    h(
      AlertDialog,
      { defaultOpen: true },
      h(AlertDialogTrigger, null, "Delete"),
      h(
        AlertDialogContent,
        null,
        h(AlertDialogTitle, null, "Delete project?"),
        h(AlertDialogDescription, null, "This cannot be undone."),
        h(AlertDialogCancel, null, "Cancel"),
        h(AlertDialogAction, { variant: "destructive" }, "Delete"),
      ),
    ),
  );
  const dialog = document.querySelector('[role="alertdialog"]');
  assert.ok(dialog);
  const [cancel, action] = dialog.querySelectorAll("button");
  assert.ok(cancel.className.includes("neshel-button-variant-outline"));
  assert.ok(action.className.includes("neshel-button-variant-destructive"));
  await view.unmount();
});

test("Sheet sides and invalid side", async () => {
  const restore = silenceWarnings();
  for (const side of ["left", "right", "top", "bottom"]) {
    const view = await mount(
      h(Sheet, { defaultOpen: true }, h(SheetContent, { side }, h(SheetTitle, null, "S"))),
    );
    assert.ok(document.querySelector(`.neshel-sheet-side-${side}[role="dialog"]`), side);
    await view.unmount();
  }
  restore();
  assert.match(String(renderError(h(SheetContent, { side: "middle" }))), /invalid value "middle"/);
});

test("Select: trigger semantics on the server, labelled by id, placeholder", () => {
  const html = renderToString(
    h(Select, {
      id: "country",
      name: "country",
      options,
      placeholder: "Choose a country",
      invalid: true,
    }),
  );
  const { tag, attrs } = firstElement(html);
  assert.equal(tag, "button");
  assert.equal(attrs.id, "country");
  assert.equal(attrs.role, "combobox");
  assert.equal(attrs["aria-invalid"], "true");
  assert.match(html, /Choose a country/);
  assert.match(
    String(renderError(h(Select, { options: [{ value: 1 }] }))),
    /string "value" and "label"/,
  );
  assert.match(
    String(renderError(h(Select, { options: [options[0], options[0]] }))),
    /duplicate option value "cr"/,
  );
});

test("Select and MultiSelect serialise their values into FormData", async () => {
  const view = await mount(
    h(
      "form",
      null,
      h(Select, { name: "country", options, defaultValue: "es", "aria-label": "Country" }),
      h(MultiSelect, {
        name: "langs",
        options,
        defaultValue: ["cr", "es"],
        "aria-label": "Languages",
      }),
    ),
  );
  const data = new FormData(view.container.querySelector("form"));
  assert.equal(data.get("country"), "es");
  assert.deepEqual(data.getAll("langs").sort(), ["cr", "es"]);
  assert.match(view.container.textContent, /Spain/);
  await view.unmount();
});

test("MultiSelect: chips beside the trigger, removal updates value, announces and moves focus", async () => {
  const changes = [];
  const view = await mount(
    h(MultiSelect, {
      options,
      defaultValue: ["cr", "es"],
      "aria-label": "Countries",
      onValueChange: (v) => changes.push(v),
    }),
  );
  const trigger = view.container.querySelector("button[role=combobox]");
  assert.equal(trigger.querySelector("button"), null, "no interactive content inside the trigger");
  const remove = view.container.querySelector('button[aria-label="Remove Costa Rica"]');
  assert.ok(remove);
  await click(remove);
  assert.deepEqual(changes, [["es"]]);
  assert.equal(view.container.querySelector('[role="status"]').textContent, "Costa Rica removed");
  assert.equal(document.activeElement?.getAttribute("aria-label"), "Remove Spain");
  await click(view.container.querySelector(".neshel-multi-select-clear"));
  assert.deepEqual(changes.at(-1), []);
  assert.equal(document.activeElement, trigger);
  await view.unmount();
});

test("Combobox: input with combobox role, multiple chips keep labels after external filtering", async () => {
  const html = renderToString(
    h(Combobox, {
      id: "tech",
      items: [{ value: "ts", label: "TypeScript" }],
      placeholder: "Search",
    }),
  );
  assert.match(html, /<input[^>]*id="tech"/);
  assert.match(html, /role="combobox"/);

  const all = [
    { value: "ts", label: "TypeScript" },
    { value: "rs", label: "Rust" },
  ];
  const view = await mount(
    h(
      "form",
      null,
      h(Combobox, {
        multiple: true,
        name: "tech",
        items: all,
        defaultValue: ["ts", "rs"],
        "aria-label": "Technologies",
      }),
    ),
  );
  assert.match(view.container.textContent, /TypeScript/);
  await view.rerender(
    h(
      "form",
      null,
      h(Combobox, {
        multiple: true,
        name: "tech",
        items: [all[1]],
        filter: null,
        defaultValue: ["ts", "rs"],
        "aria-label": "Technologies",
      }),
    ),
  );
  assert.match(view.container.textContent, /TypeScript/, "label kept from the cache");
  assert.deepEqual(new FormData(view.container.querySelector("form")).getAll("tech").sort(), [
    "rs",
    "ts",
  ]);
  assert.ok(view.container.querySelector('button[aria-label="Remove Rust"]'));
  await view.unmount();
  assert.match(
    String(renderError(h(Combobox, { items: [all[0], { label: "G", items: [] }] }))),
    /only items or only groups/,
  );
});

test("Navbar: header, labelled nav list, aria-current, responsive hideBelow", () => {
  const html = markup(
    h(
      Navbar,
      { sticky: true },
      h(NavbarBrand, { asChild: true }, h("a", { href: "/" }, "Neshel")),
      h(
        NavbarNav,
        { hideBelow: "md" },
        h(NavbarLink, { href: "/", active: true }, "Home"),
        h(NavbarLink, { asChild: true }, h("a", { href: "/docs" }, "Docs")),
      ),
      h(NavbarActions, null, "A"),
    ),
  );
  assert.match(html, /^<header class="neshel-navbar neshel-navbar-sticky">/);
  assert.match(html, /<a href="\/" class="neshel-navbar-brand">Neshel<\/a>/);
  assert.match(
    html,
    /<nav aria-label="Main" class="neshel-navbar-nav neshel-navbar-nav-responsive neshel-md-navbar-nav-visible"><ul class="neshel-navbar-list"><li><a href="\/" aria-current="page"/,
  );
  assert.match(html, /<li><a href="\/docs" class="neshel-navbar-link">Docs<\/a><\/li>/);
});

test("NavigationMenu renders a nav landmark with aria-current links", () => {
  const html = renderToString(
    h(
      NavigationMenu,
      { "aria-label": "Site" },
      h(
        NavigationMenuList,
        null,
        h(NavigationMenuItem, null, h(NavigationMenuLink, { href: "/", active: true }, "Home")),
      ),
    ),
  );
  assert.match(html, /<nav aria-label="Site"/);
  assert.match(html, /aria-current="page"/);
});

test("DropdownMenu: Enter on the trigger opens a menu with menuitems", async () => {
  const view = await mount(
    h(
      DropdownMenu,
      null,
      h(DropdownMenuTrigger, { id: "t" }, "Account"),
      h(
        DropdownMenuContent,
        null,
        h(DropdownMenuItem, null, "Profile"),
        h(DropdownMenuItem, { variant: "destructive" }, "Sign out"),
      ),
    ),
  );
  await key(view.container.querySelector("#t"), "Enter");
  const menu = document.querySelector('[role="menu"]');
  assert.ok(menu, "menu opened");
  assert.equal(menu.querySelectorAll('[role="menuitem"]').length, 2);
  assert.ok(menu.querySelector(".neshel-menu-item-destructive"));
  await view.unmount();
});

test("MobileMenu: trigger classes per breakpoint, links close the sheet", async () => {
  const restore = silenceWarnings();
  const view = await mount(
    h(
      MobileMenu,
      { breakpoint: "tablet" },
      h(MobileMenuTrigger),
      h(
        MobileMenuContent,
        null,
        h(MobileMenuNav, null, h(MobileMenuLink, { href: "#docs", active: true }, "Docs")),
      ),
    ),
  );
  const trigger = view.container.querySelector("button");
  assert.equal(trigger.getAttribute("aria-label"), "Open menu");
  assert.ok(trigger.className.includes("neshel-tablet-menu-desktop"));
  await click(trigger);
  const link = document.querySelector('[role="dialog"] a[aria-current="page"]');
  assert.ok(link, "menu open with the active link");
  await click(link);
  assert.equal(document.querySelector('[role="dialog"]'), null, "closed after navigation");
  await view.unmount();
  restore();
});

function shell(props = {}, sidebarProps = {}) {
  return h(
    AppShell,
    props,
    h(
      Sidebar,
      sidebarProps,
      h(
        SidebarContent,
        null,
        h(
          SidebarGroup,
          { label: "Workspace" },
          h(
            SidebarItem,
            { asChild: true, active: true, icon: h("svg") },
            h("a", { href: "/dashboard" }, "Dashboard"),
          ),
          h(SidebarItem, null, "Settings"),
          h(
            SidebarSub,
            { label: "Reports" },
            h(SidebarItem, { asChild: true }, h("a", { href: "/r" }, "Monthly")),
          ),
        ),
      ),
    ),
    h(AppShellMain, null, h(SidebarTrigger), h(AppShellContent, { id: "main" }, "Content")),
  );
}

test("AppShell SSR: landmarks, breakpoint class, single sidebar copy, trigger state", () => {
  const html = renderToString(shell({ breakpoint: "tablet" }));
  assert.match(html, /^<div class="neshel-app-shell neshel-tablet-shell-desktop">/);
  assert.match(
    html,
    /<aside aria-label="Sidebar" id="[^"]+-sidebar" data-collapsible="icon" class="neshel-sidebar">/,
  );
  assert.match(html, /<nav aria-label="Main navigation" class="neshel-sidebar-content">/);
  assert.match(html, /<main id="main" class="neshel-app-shell-content">Content<\/main>/);
  assert.match(html, /<a href="\/dashboard" data-active="" aria-current="page"/);
  assert.match(
    html,
    /aria-label="Toggle sidebar" aria-controls="[^"]+-sidebar" aria-expanded="true"/,
  );
  assert.equal((html.match(/Dashboard/g) ?? []).length, 1);
  assert.match(html, /aria-expanded="false" aria-controls="[^"]+"[^>]*>.*Reports/);
});

test("AppShell: trigger collapses the rail (uncontrolled) and reports controlled changes", async () => {
  const changes = [];
  const view = await mount(
    shell({ breakpoint: "base", onCollapsedChange: (v) => changes.push(v) }),
  );
  const trigger = view.container.querySelector(".neshel-sidebar-trigger");
  await click(trigger);
  const aside = view.container.querySelector("aside");
  assert.equal(aside.hasAttribute("data-collapsed"), true);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.deepEqual(changes, [true]);
  await view.rerender(shell({ breakpoint: "base", collapsed: false }));
  assert.equal(view.container.querySelector("aside").hasAttribute("data-collapsed"), false);
  await view.unmount();
});

test("Sidebar standalone and SidebarTrigger outside AppShell", () => {
  assert.match(markup(h(Sidebar, { collapsed: true }, "x")), /data-collapsed=""/);
  assert.match(String(renderError(h(SidebarTrigger))), /must be rendered inside <AppShell>/);
  assert.match(
    String(renderError(h(AppShell, { breakpoint: "Not-A-Key" }))),
    /invalid breakpoint key/,
  );
  assert.match(String(renderError(h(Sidebar, { collapsible: "rail" }))), /invalid value "rail"/);
});
