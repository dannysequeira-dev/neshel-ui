// Distributed stylesheet and manifest (FR-003, FR-004, ADR 0013): drift, hygiene, runtime classes
// defined, no collisions with layout/typography, size budget, shared breakpoint module.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { findDrift } from "../../../scripts/generate-component-css.mjs";
import { checkComponentsStylesheet } from "../../../scripts/lib/components-css.mjs";
import {
  missingFromStylesheet,
  neshelClasses,
  stylesheetClasses,
} from "../../../scripts/lib/layout-css.mjs";
import { h, mount, ui } from "./helpers.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../dist/styles.css");

test("committed stylesheet and manifest equal the generator output; dist copies them", async () => {
  assert.deepEqual(
    await findDrift(["components"]),
    [],
    "run pnpm build:packages && pnpm generate:component-css",
  );
  assert.equal(css, read("../src/styles.css"));
  assert.equal(read("../dist/style-manifest.json"), read("../src/style-manifest.json"));
  const manifest = JSON.parse(read("../src/style-manifest.json"));
  assert.equal(manifest.schema, 2);
  assert.equal(manifest.layer, "components.neshel");
});

test("stylesheet hygiene: layer, no directives, no colour literals, neshel selectors only", () => {
  assert.deepEqual(checkComponentsStylesheet(css), []);
  // Negative controls: the checker detects violations.
  assert.ok(checkComponentsStylesheet(css.replace("var(--neshel-primary)", "#193767")).length > 0);
  assert.ok(checkComponentsStylesheet(`${css}\nbody { margin: 0; }`).length > 0);
  assert.ok(checkComponentsStylesheet(css.replace("@layer components.neshel {", "{")).length > 0);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@keyframes neshel-zoom-in/);
});

test("no class collides with the layout or typography stylesheets", () => {
  const own = new Set(stylesheetClasses(css).filter((name) => !name.startsWith("neshel-") || true));
  for (const other of ["../../layout/dist/styles.css", "../../typography/dist/styles.css"]) {
    const clashes = stylesheetClasses(read(other)).filter((name) => own.has(name));
    assert.deepEqual(clashes, [], other);
  }
});

test("every class rendered by the components (open states included) is defined", async () => {
  const {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AppShell,
    AppShellContent,
    AppShellMain,
    Badge,
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Combobox,
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    Input,
    Label,
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
    NavigationMenuTrigger,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Select,
    Separator,
    Sheet,
    SheetContent,
    SheetTitle,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarItem,
    SidebarSeparator,
    SidebarSub,
    SidebarTrigger,
    Skeleton,
    VisuallyHidden,
  } = ui;
  const warn = console.warn;
  console.warn = () => {};
  const options = [
    { value: "a", label: "A" },
    { label: "G", options: [{ value: "b", label: "B" }] },
  ];
  const views = [];
  const sizes = ["sm", "md", "lg"];
  views.push(
    await mount(
      h(
        "div",
        null,
        ...["primary", "secondary", "outline", "ghost", "destructive", "link"].map((variant) =>
          h(
            Button,
            {
              variant,
              size: { base: "sm", md: "lg" },
              iconOnly: true,
              fullWidth: true,
              loading: true,
              "aria-label": "x",
            },
            "x",
          ),
        ),
        ...["default", "secondary", "outline", "success", "warning", "destructive", "accent"].map(
          (variant) => h(Badge, { variant, size: "sm" }, variant),
        ),
        ...["default", "outline", "muted"].map((variant, index) =>
          h(
            Card,
            { variant, padding: sizes[index] },
            h(
              CardHeader,
              null,
              h(CardTitle, null, "t"),
              h(CardDescription, null, "d"),
              h(CardAction, null, "a"),
            ),
            h(CardContent, null, "c"),
            h(CardFooter, null, "f"),
          ),
        ),
        ...sizes.map((uiSize) => h(Input, { uiSize, "aria-label": uiSize })),
        h(Label, { required: true }, "L"),
        h(VisuallyHidden, null, "v"),
        h(Separator, { orientation: "vertical" }),
        h(Separator),
        ...["rectangle", "circle", "text"].map((shape) => h(Skeleton, { shape })),
        h(
          Navbar,
          { sticky: true },
          h(NavbarBrand, null, "B"),
          h(NavbarNav, { hideBelow: "md" }, h(NavbarLink, { href: "#", active: true }, "L")),
          h(NavbarActions, null, "A"),
        ),
        h(
          NavigationMenu,
          { "aria-label": "n" },
          h(
            NavigationMenuList,
            null,
            h(NavigationMenuItem, null, h(NavigationMenuTrigger, null, "T")),
            h(NavigationMenuItem, null, h(NavigationMenuLink, { href: "#" }, "L")),
          ),
        ),
        h(Select, { options, defaultOpen: true, "aria-label": "s" }),
        h(MultiSelect, { options, defaultValue: ["a"], "aria-label": "m" }),
        h(Combobox, { items: [{ value: "a", label: "A" }], "aria-label": "c" }),
        h(Combobox, {
          multiple: true,
          items: [{ value: "a", label: "A" }],
          defaultValue: ["a"],
          "aria-label": "c2",
        }),
        h(
          MobileMenu,
          { defaultOpen: true },
          h(MobileMenuTrigger),
          h(
            MobileMenuContent,
            null,
            h(MobileMenuNav, null, h(MobileMenuLink, { href: "#", active: true }, "L")),
          ),
        ),
        h(
          AppShell,
          { breakpoint: "base" },
          h(
            Sidebar,
            null,
            h(SidebarHeader, null, "H"),
            h(
              SidebarContent,
              null,
              h(
                SidebarGroup,
                { label: "G" },
                h(SidebarItem, { icon: h("svg"), active: true }, "I"),
                h(SidebarSub, { label: "S", defaultOpen: true }, h(SidebarItem, null, "J")),
              ),
            ),
            h(SidebarSeparator),
            h(SidebarFooter, null, "F"),
          ),
          h(AppShellMain, null, h(SidebarTrigger), h(AppShellContent, null, "C")),
        ),
      ),
    ),
  );
  for (const size of ["sm", "md", "lg", "xl", "full"]) {
    views.push(
      await mount(
        h(
          Dialog,
          { defaultOpen: true },
          h(
            DialogContent,
            { size, "aria-describedby": undefined },
            h(DialogHeader, null, h(DialogTitle, null, "T"), h(DialogDescription, null, "D")),
            h(DialogBody, null, "B"),
            h(DialogFooter, null, "F"),
          ),
        ),
      ),
    );
  }
  for (const side of ["left", "right", "top", "bottom"]) {
    for (const size of sizes)
      views.push(
        await mount(
          h(
            Sheet,
            { defaultOpen: true },
            h(SheetContent, { side, size }, h(SheetTitle, null, "S")),
          ),
        ),
      );
  }
  views.push(
    await mount(
      h(
        AlertDialog,
        { defaultOpen: true },
        h(
          AlertDialogContent,
          { size: "md" },
          h(
            AlertDialogHeader,
            null,
            h(AlertDialogTitle, null, "T"),
            h(AlertDialogDescription, null, "D"),
          ),
          h(
            AlertDialogFooter,
            null,
            h(AlertDialogCancel, null, "C"),
            h(AlertDialogAction, null, "A"),
          ),
        ),
      ),
    ),
  );
  views.push(
    await mount(
      h(Popover, { defaultOpen: true }, h(PopoverTrigger, null, "P"), h(PopoverContent, null, "C")),
    ),
  );
  views.push(
    await mount(
      h(
        DropdownMenu,
        { defaultOpen: true },
        h(
          DropdownMenuContent,
          null,
          h(DropdownMenuLabel, { inset: true }, "L"),
          h(
            DropdownMenuItem,
            { variant: "destructive", inset: true },
            "I",
            h(DropdownMenuShortcut, null, "⌘K"),
          ),
          h(DropdownMenuCheckboxItem, { checked: true }, "C"),
          h(DropdownMenuRadioGroup, { value: "a" }, h(DropdownMenuRadioItem, { value: "a" }, "R")),
          h(DropdownMenuSeparator),
          h(DropdownMenuSub, null, h(DropdownMenuSubTrigger, null, "S")),
        ),
      ),
    ),
  );
  const used = neshelClasses(
    [...document.querySelectorAll("[class]")].map((element) => element.getAttribute("class")),
  );
  for (const view of views) await view.unmount();
  console.warn = warn;
  assert.deepEqual(missingFromStylesheet(used, css), []);
  assert.ok(used.length > 120, `swept ${used.length} classes`);
});

test("size budget (contracts/components-css.md)", () => {
  const raw = Buffer.byteLength(css);
  const gzip = gzipSync(css).byteLength;
  assert.ok(raw <= 64 * 1024, `raw ${raw} > 64 KiB`);
  assert.ok(gzip <= 10 * 1024, `gzip ${gzip} > 10 KiB`);
  console.info(`components styles.css: ${raw} bytes raw, ${gzip} bytes gzip`);
});

test("breakpoint-check.ts is identical in layout, typography and components (analysis B10)", () => {
  const copy = read("../src/internal/breakpoint-check.ts");
  assert.equal(copy, read("../../layout/src/breakpoint-check.ts"));
  assert.equal(copy, read("../../typography/src/breakpoint-check.ts"));
});
