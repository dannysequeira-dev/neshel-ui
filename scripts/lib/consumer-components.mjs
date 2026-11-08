// Feature 005 external consumers (FR-123): packed @neshel-ui/components in generated React 19 +
// Vite apps outside the repository. Each variant builds a "lab" page (every component family,
// native form, nested theme boundary) and a "shell" page (AppShell + Sidebar), prerenders both
// with react-dom/server from the tarballs and hands dist/ to `check:browser:components`.
//   components-tailwind : Tailwind v4 + config/tailwind.css + components/styles.css
//   components-plain    : no Tailwind, config/tokens.css + components/styles.css; tree-shaking
//   components-extend   : extend breakpoints (phone, tablet), named theme, Tailwind @theme sync
//   components-replace  : replace breakpoints, named theme, generated CSS instead of package CSS
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkComponentsStylesheet } from "./components-css.mjs";
import { stylesheetClasses } from "./layout-css.mjs";
import { pnpm } from "./pnpm.mjs";

export const COMPONENTS = "@neshel-ui/components";

/** Parameters shared with the browser suite (scripts/lib/components-browser.mjs). */
export const COMPONENT_VARIANTS = {
  "components-tailwind": {
    shell: "lg",
    shellWidth: "64rem",
    button: "md",
    buttonWidth: "48rem",
    theme: "dark",
  },
  "components-plain": {
    shell: "lg",
    shellWidth: "64rem",
    button: "md",
    buttonWidth: "48rem",
    theme: "dark",
  },
  "components-extend": {
    shell: "tablet",
    shellWidth: "52rem",
    button: "phone",
    buttonWidth: "30rem",
    theme: "sepia",
    mode: "extend",
    breakpoints: { phone: "30rem", tablet: "52rem" },
  },
  "components-replace": {
    shell: "desktop",
    shellWidth: "60rem",
    button: "tablet",
    buttonWidth: "45rem",
    theme: "sepia",
    mode: "replace",
    breakpoints: { phone: "30rem", tablet: "45rem", desktop: "60rem", wide: "90rem" },
  },
};

export const THEME_FIXTURE = {
  sepia: {
    extends: "light",
    colors: {
      background: "#f4ecd8",
      surface: "#fbf4e4",
      foreground: "#2b2118",
      surfaceForeground: "#2b2118",
      primary: "#5b3a1a",
    },
  },
};

const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>`;

/** The lab and shell pages; `params` come from COMPONENT_VARIANTS. */
export function appTsx(params) {
  return `import { type FormEvent, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AppShell,
  AppShellContent, AppShellMain, Badge, Button, Card, CardContent, CardDescription, CardFooter,
  CardHeader, CardTitle, Combobox, Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Input, Label,
  MobileMenu, MobileMenuContent, MobileMenuLink, MobileMenuNav, MobileMenuTrigger, MultiSelect,
  Navbar, NavbarActions, NavbarBrand, NavbarLink, NavbarNav, NavigationMenu, NavigationMenuContent,
  NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, Popover,
  PopoverContent, PopoverTrigger, Select, Separator, Sheet, SheetContent, SheetDescription,
  SheetHeader, SheetTitle, SheetTrigger, Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarHeader, SidebarItem, SidebarSub, SidebarTrigger, Skeleton,
} from "${COMPONENTS}";

const countries = [
  { value: "cr", label: "Costa Rica" },
  { value: "es", label: "Spain" },
  { value: "jp", label: "Japan" },
  { value: "mx", label: "Mexico", disabled: true },
];
const languages = [
  { label: "European", options: [{ value: "es", label: "Spanish" }, { value: "fr", label: "French" }] },
  { label: "Asian", options: [{ value: "ja", label: "Japanese" }] },
];
const technologies = [
  { value: "ts", label: "TypeScript" },
  { value: "rs", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "py", label: "Python" },
];
const Icon = () => (${icon});

function Lab() {
  const [result, setResult] = useState("");
  const [alert, setAlert] = useState("none");
  const [menu, setMenu] = useState("none");
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(JSON.stringify([...new FormData(event.currentTarget).entries()]));
  };
  return (
    <>
      <Navbar>
        <NavbarBrand>Neshel lab</NavbarBrand>
        <NavbarNav hideBelow="${params.shell}" id="navbar-nav">
          <NavbarLink href="#home" active>Home</NavbarLink>
          <NavbarLink href="#docs">Docs</NavbarLink>
        </NavbarNav>
        <NavbarActions>
          <MobileMenu breakpoint="${params.shell}">
            <MobileMenuTrigger id="mobile-trigger" />
            <MobileMenuContent>
              <MobileMenuNav>
                <MobileMenuLink href="#home" active>Home</MobileMenuLink>
                <MobileMenuLink id="mobile-docs" href="#docs">Docs</MobileMenuLink>
              </MobileMenuNav>
            </MobileMenuContent>
          </MobileMenu>
        </NavbarActions>
      </Navbar>
      <main className="lab">
        <h1>Neshel-UI components lab</h1>
        <section data-case="foundation" aria-label="Foundation">
          <Button id="btn-primary">Continue</Button>
          <Button id="btn-responsive" variant="outline" size={{ base: "sm", ${params.button}: "lg" }}>Responsive</Button>
          <Button id="btn-loading" loading>Saving</Button>
          <Button asChild variant="ghost"><a id="btn-link" href="#docs">Documentation</a></Button>
          <Badge id="badge-success" variant="success">Completed</Badge>
          <Badge variant="warning">Pending</Badge>
          <Separator />
          <Skeleton width={120} />
          <Card id="card">
            <CardHeader>
              <CardTitle as="h2">Account overview</CardTitle>
              <CardDescription>Your latest activity.</CardDescription>
            </CardHeader>
            <CardContent><p>Account information</p></CardContent>
            <CardFooter><Button size="sm">Open</Button></CardFooter>
          </Card>
        </section>
        <section data-case="overlays" aria-label="Overlays">
          <Dialog>
            <DialogTrigger asChild><Button id="dialog-trigger">Edit profile</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>Update your account information.</DialogDescription>
              </DialogHeader>
              <Label htmlFor="dialog-name">Name</Label>
              <Input id="dialog-name" defaultValue="Ana" />
              <Label htmlFor="dialog-select">Country</Label>
              <Select id="dialog-select" options={countries} placeholder="Choose a country" />
              <Dialog>
                <DialogTrigger asChild><Button id="nested-trigger" variant="secondary">Nested</Button></DialogTrigger>
                <DialogContent aria-describedby={undefined} size="sm">
                  <DialogTitle>Nested dialog</DialogTitle>
                  <DialogClose asChild><Button id="nested-close">Done</Button></DialogClose>
                </DialogContent>
              </Dialog>
              <DialogFooter>
                <DialogClose asChild><Button id="dialog-cancel" variant="outline">Cancel</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button id="alert-trigger" variant="destructive">Delete project</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel id="alert-cancel" onClick={() => setAlert("cancelled")}>Cancel</AlertDialogCancel>
                <AlertDialogAction id="alert-action" variant="destructive" onClick={() => setAlert("deleted")}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <output id="alert-result">{alert}</output>
          <Popover>
            <PopoverTrigger asChild><Button id="popover-trigger" variant="outline">Details</Button></PopoverTrigger>
            <PopoverContent id="popover-content">
              <p>Popover body</p>
              <Button id="popover-inner" size="sm">Inner</Button>
            </PopoverContent>
          </Popover>
          <Sheet>
            <SheetTrigger asChild><Button id="sheet-trigger" variant="outline">Filters</Button></SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Narrow the results.</SheetDescription>
              </SheetHeader>
              <Input id="sheet-input" aria-label="Keyword" />
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button id="menu-trigger" variant="outline">Account</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setMenu("profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMenu("settings")}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setMenu("signout")}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <output id="menu-result">{menu}</output>
          <NavigationMenu aria-label="Products">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger id="nav-trigger">Products</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuLink id="nav-link-a" href="#analytics">Analytics</NavigationMenuLink>
                  <NavigationMenuLink href="#billing">Billing</NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#pricing" active>Pricing</NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </section>
        <section data-case="form" aria-label="Form">
          <form id="form" onSubmit={onSubmit}>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue="Ruth" autoComplete="name" />
            <Label htmlFor="country">Country</Label>
            <Select id="country" name="country" options={countries} placeholder="Select a country" />
            <Label htmlFor="languages">Languages</Label>
            <MultiSelect id="languages" name="languages" options={languages} placeholder="Select languages" />
            <Label htmlFor="city">Destination</Label>
            <Combobox id="city" name="city" items={countries} placeholder="Search a country" />
            <Label htmlFor="tech">Technologies</Label>
            <Combobox id="tech" name="tech" multiple items={technologies} placeholder="Select technologies" />
            <Button type="submit" id="submit">Submit</Button>
          </form>
          <output id="form-result">{result}</output>
        </section>
        <section id="theme-boundary" data-neshel-theme="${params.theme}" aria-label="Themed region" className="theme-boundary">
          <Dialog>
            <DialogTrigger asChild><Button id="theme-dialog-trigger">Themed dialog</Button></DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogTitle>Themed dialog</DialogTitle>
              <Label htmlFor="theme-select">Country</Label>
              <Select id="theme-select" options={countries} placeholder="Choose" />
            </DialogContent>
          </Dialog>
          <Popover>
            <PopoverTrigger asChild><Button id="theme-popover-trigger" variant="outline">Themed popover</Button></PopoverTrigger>
            <PopoverContent>Themed popover</PopoverContent>
          </Popover>
        </section>
      </main>
    </>
  );
}

function Shell() {
  return (
    <AppShell breakpoint="${params.shell}" id="shell">
      <Sidebar>
        <SidebarHeader><strong>Neshel</strong></SidebarHeader>
        <SidebarContent>
          <SidebarGroup label="Workspace">
            <SidebarItem asChild active icon={<Icon />}><a id="side-dashboard" href="#dashboard">Dashboard</a></SidebarItem>
            <SidebarItem asChild icon={<Icon />}><a id="side-settings" href="#settings">Settings</a></SidebarItem>
            <SidebarSub label="Reports" icon={<Icon />}>
              <SidebarItem asChild><a href="#monthly">Monthly</a></SidebarItem>
            </SidebarSub>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>Signed in</SidebarFooter>
      </Sidebar>
      <AppShellMain>
        <Navbar>
          <SidebarTrigger id="sidebar-trigger" />
          <NavbarBrand>Dashboard</NavbarBrand>
        </Navbar>
        <AppShellContent id="shell-main">
          <h1>Shell content</h1>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
}

const detect = () =>
  typeof window !== "undefined" && window.location.pathname.endsWith("shell.html") ? "shell" : "lab";

export function App({ page = detect() }: { page?: "lab" | "shell" }) {
  return page === "shell" ? <Shell /> : <Lab />;
}
`;
}

const entryServerTsx = `import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { App } from "./App";

export function render(page: "lab" | "shell") {
  return renderToString(<StrictMode><App page={page} /></StrictMode>);
}
`;

const prerenderMjs = `import { readFileSync, writeFileSync } from "node:fs";
const { render } = await import("./dist-server/entry-server.js");
const template = readFileSync("dist/index.html", "utf8");
if (!template.includes('<div id="root"></div>')) throw new Error("dist/index.html has no empty #root");
const lab = render("lab");
const shell = render("shell");
writeFileSync("dist/index.html", template.replace('<div id="root"></div>', '<div id="root">' + lab + "</div>"));
writeFileSync("dist/shell.html", template.replace('<div id="root"></div>', '<div id="root">' + shell + "</div>"));
const result = { lab: lab.length, shell: shell.length, windowDefined: typeof window !== "undefined" };
await import("${COMPONENTS}");
result.stylesheet = import.meta.resolve("${COMPONENTS}/styles.css");
try {
  await import("${COMPONENTS}/dist/index.js");
  result.deepImport = "resolved";
} catch (error) {
  result.deepImport = error.code;
}
console.log(JSON.stringify(result));
`;

/** Bundle containing only Button: no Radix or Base UI code (SC-007). */
const treeShakeEntry = `import { Button } from "${COMPONENTS}";
export const element = Button;
`;
const treeShakeFullEntry = `export * from "${COMPONENTS}";
`;
const bundleSizeMjs = `import { build } from "vite";
async function size(entry) {
  const [result] = [].concat(
    await build({
      configFile: false,
      logLevel: "silent",
      build: {
        write: false,
        minify: true,
        lib: { entry, formats: ["es"], fileName: "size" },
        rollupOptions: { external: ["react", "react/jsx-runtime", "react-dom"] },
      },
    }),
  );
  const code = result.output.filter((chunk) => chunk.type === "chunk").map((chunk) => chunk.code).join("");
  return { bytes: Buffer.byteLength(code), code };
}
// Strings that survive minification in Radix layers and in Base UI / Floating UI.
const MARKERS = ["data-radix-focus-guard", "DismissableLayer", "FocusScope", "data-base-ui", "floating-ui"];
const button = await size("tree-shake-button.ts");
const full = await size("tree-shake-full.ts");
console.log(JSON.stringify({
  button: button.bytes,
  full: full.bytes,
  buttonMarkers: MARKERS.filter((m) => button.code.includes(m)),
  fullMarkers: MARKERS.filter((m) => full.code.includes(m)),
}));
`;

const LAB_CSS = `body { margin: 0; font-family: var(--neshel-font-body); background: var(--neshel-background); color: var(--neshel-foreground); }
.lab { display: grid; gap: 24px; padding: 24px; }
.lab section { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.lab form { display: grid; gap: 8px; max-width: 420px; }
.theme-boundary { padding: 16px; background: var(--neshel-background); color: var(--neshel-foreground); }
`;

function prerender({ appDir, node, step }) {
  const errors = [];
  const vite = join(appDir, "node_modules", "vite", "bin", "vite.js");
  const ssr = step("vite build --ssr (server entry)", () =>
    node([vite, "build", "--ssr", "src/entry-server.tsx", "--outDir", "dist-server"], appDir),
  );
  if (ssr.status !== 0) return [`SSR build failed:\n${ssr.stdout}${ssr.stderr}`];
  const run = step("prerender lab and shell pages from the tarballs", () =>
    node(["prerender.mjs"], appDir),
  );
  let result;
  try {
    result = JSON.parse(run.stdout.trim().split("\n").at(-1));
  } catch {
    return [`prerender failed:\n${run.stdout}${run.stderr}`];
  }
  if (result.windowDefined) errors.push("prerender ran with a window global");
  if (result.lab < 2000 || result.shell < 500) errors.push("server render is unexpectedly small");
  if (!String(result.stylesheet).includes("node_modules"))
    errors.push(`${COMPONENTS}/styles.css resolved outside node_modules`);
  if (result.deepImport !== "ERR_PACKAGE_PATH_NOT_EXPORTED")
    errors.push(
      `${COMPONENTS}/dist/index.js was not blocked by "exports" (got ${result.deepImport})`,
    );
  const store = join(appDir, "node_modules", ".pnpm");
  const entries = existsSync(store) ? readdirSync(store) : [];
  for (const forbidden of [
    "@neshel-ui+core",
    "@neshel-ui+layout",
    "@neshel-ui+typography",
    "tailwind-merge",
  ]) {
    if (entries.some((entry) => entry.startsWith(forbidden)))
      errors.push(`dependency leak: ${forbidden} installed by a components-only consumer`);
  }
  console.info(`  · SSR: lab ${result.lab} bytes, shell ${result.shell} bytes prerendered`);
  return errors;
}

function generate({ appDir, step }) {
  const run = (args) => {
    try {
      return { ok: true, output: pnpm(["exec", "neshel", ...args], appDir, { isolated: true }) };
    } catch (error) {
      return { ok: false, output: error.message };
    }
  };
  const generated = step("neshel generate (themes, breakpoints, components CSS)", () =>
    run(["generate"]),
  );
  return generated.ok ? [] : [`neshel generate failed:\n${generated.output}`];
}

function componentCssErrors(outputCss, appDir, { expect = [], forbid } = {}) {
  const errors = [];
  const installed = join(appDir, "node_modules", ...COMPONENTS.split("/"), "dist", "styles.css");
  const packageCss = readFileSync(installed, "utf8");
  errors.push(...checkComponentsStylesheet(packageCss).map((e) => `installed styles.css: ${e}`));
  const built = new Set(stylesheetClasses(outputCss));
  const missing = stylesheetClasses(packageCss)
    .filter((name) => !/^neshel-(sm|md|lg|xl|2xl)-/.test(name) || !forbid)
    .filter((name) => !built.has(name));
  if (missing.length)
    errors.push(
      `built CSS lacks ${missing.length} components selector(s), e.g. ${missing.slice(0, 5).join(", ")}`,
    );
  for (const name of expect) if (!built.has(name)) errors.push(`built CSS lacks .${name}`);
  if (forbid && [...built].some((name) => forbid.test(name)))
    errors.push("built CSS still contains default-breakpoint component classes");
  if (/@source\b/.test(outputCss)) errors.push("built CSS contains @source");
  if (!/@layer\s+components\.neshel\b|@layer\s+components\s*\{\s*@layer\s+neshel\b/.test(outputCss))
    errors.push("built CSS lost the components.neshel layer");
  return errors;
}

export function componentVariants({ CONFIG, CLI, BASE_DEV, TAILWIND_DEV, viteConfig }) {
  const tailwindVite = viteConfig({
    imports:
      'import tailwindcss from "@tailwindcss/vite";\nimport react from "@vitejs/plugin-react";',
    list: "react(), tailwindcss()",
  });
  const plainVite = viteConfig({
    imports: 'import react from "@vitejs/plugin-react";',
    list: "react()",
  });
  const shared = (name) => ({
    "src/App.tsx": appTsx(COMPONENT_VARIANTS[name]),
    "src/entry-server.tsx": entryServerTsx,
    "src/lab.css": LAB_CSS,
    "prerender.mjs": prerenderMjs,
  });
  const configFile = (name) => {
    const params = COMPONENT_VARIANTS[name];
    const config = {
      themes: THEME_FIXTURE,
      breakpoints: {
        mode: params.mode,
        values: params.breakpoints,
        ...(params.mode === "extend" ? { tailwind: true } : {}),
      },
      output: "./src/neshel.generated.css",
      types: "./src/neshel.generated.d.ts",
    };
    return `import { defineConfig } from "${CONFIG}";\n\nexport default defineConfig(${JSON.stringify(config, null, 2)});\n`;
  };
  return {
    "components-tailwind": {
      title: "Neshel-UI consumer — components + Tailwind",
      devDependencies: [...BASE_DEV, ...TAILWIND_DEV],
      packages: [CONFIG, COMPONENTS],
      files: () => ({
        ...shared("components-tailwind"),
        "vite.config.ts": tailwindVite,
        "src/styles.css": `@import "tailwindcss";\n@import "${CONFIG}/tailwind.css";\n@import "${COMPONENTS}/styles.css";\n@import "./lab.css";\n`,
      }),
      postBuild: prerender,
      check: ({ outputCss, appDir }) => componentCssErrors(outputCss, appDir),
    },
    "components-plain": {
      title: "Neshel-UI consumer — components, plain CSS",
      devDependencies: BASE_DEV,
      packages: [CONFIG, COMPONENTS],
      files: () => ({
        ...shared("components-plain"),
        "vite.config.ts": plainVite,
        "src/styles.css": `@import "${CONFIG}/tokens.css";\n@import "${COMPONENTS}/styles.css";\n@import "./lab.css";\n`,
        "tree-shake-button.ts": treeShakeEntry,
        "tree-shake-full.ts": treeShakeFullEntry,
        "bundle-size.mjs": bundleSizeMjs,
      }),
      postBuild: prerender,
      check: ({ outputCss, appDir, buildLog, node }) => {
        const errors = componentCssErrors(outputCss, appDir);
        if (/unknown at[- ]rule/i.test(buildLog))
          errors.push(`unknown at-rule in build:\n${buildLog}`);
        const size = node(["bundle-size.mjs"], appDir);
        try {
          const result = JSON.parse(size.stdout.trim().split("\n").at(-1));
          if (result.buttonMarkers.length)
            errors.push(
              `Button-only bundle contains headless engine code (${result.buttonMarkers.join(", ")})`,
            );
          // Positive control: the same markers exist in the full library bundle.
          if (result.fullMarkers.length !== 5)
            errors.push(
              `marker control failed: full bundle contains only ${result.fullMarkers.join(", ")}`,
            );
          // Regression guard (Slot + tailwind-variants + validation helpers measured at ~25 KiB).
          if (result.button > 32 * 1024)
            errors.push(`Button-only bundle is ${result.button} bytes (> 32 KiB)`);
          console.info(
            `  · tree-shaking: Button-only ${result.button} bytes, full library ${result.full} bytes (minified, React external)`,
          );
        } catch {
          errors.push(`bundle-size measurement failed:\n${size.stdout}${size.stderr}`);
        }
        return errors;
      },
    },
    "components-extend": {
      title: "Neshel-UI consumer — components, extend breakpoints",
      devDependencies: [...BASE_DEV, ...TAILWIND_DEV],
      packages: [CONFIG, CLI, COMPONENTS],
      files: () => ({
        ...shared("components-extend"),
        "neshel.config.ts": configFile("components-extend"),
        "vite.config.ts": tailwindVite,
        "src/styles.css": `@import "tailwindcss";\n@import "${CONFIG}/tailwind.css";\n@import "${COMPONENTS}/styles.css";\n@import "./neshel.generated.css";\n@import "./lab.css";\n`,
      }),
      prepare: generate,
      postBuild: prerender,
      check: ({ outputCss, appDir }) => {
        const errors = componentCssErrors(outputCss, appDir, {
          expect: [
            "neshel-tablet-shell-desktop",
            "neshel-phone-button-size-lg",
            "neshel-tablet-navbar-nav-visible",
            "neshel-tablet-menu-desktop",
          ],
        });
        const generated = readFileSync(join(appDir, "src", "neshel.generated.css"), "utf8");
        if (!generated.includes(`/* ${COMPONENTS} `))
          errors.push("generated CSS lacks the components section");
        if (!/\[data-neshel-theme="sepia"\]/.test(generated))
          errors.push("generated CSS lacks the sepia theme");
        return errors;
      },
    },
    "components-replace": {
      title: "Neshel-UI consumer — components, replace breakpoints",
      devDependencies: BASE_DEV,
      packages: [CONFIG, CLI, COMPONENTS],
      files: () => ({
        ...shared("components-replace"),
        "neshel.config.ts": configFile("components-replace"),
        "vite.config.ts": plainVite,
        // The generated stylesheet replaces the package stylesheet (ADR 0010).
        "src/styles.css": `@import "${CONFIG}/tokens.css";\n@import "./neshel.generated.css";\n@import "./lab.css";\n`,
      }),
      prepare: generate,
      postBuild: prerender,
      check: ({ outputCss }) => {
        const errors = [];
        const built = new Set(stylesheetClasses(outputCss));
        for (const name of [
          "neshel-desktop-shell-desktop",
          "neshel-tablet-button-size-lg",
          "neshel-desktop-menu-desktop",
          "neshel-dialog-content",
          "neshel-select-popup",
        ]) {
          if (!built.has(name)) errors.push(`built CSS lacks .${name}`);
        }
        if ([...built].some((name) => /^neshel-(sm|md|lg|xl|2xl)-/.test(name)))
          errors.push("replace mode: built CSS still contains default-breakpoint classes");
        if (!/@keyframes\s+neshel-zoom-in/.test(outputCss))
          errors.push("built CSS lacks the components keyframes");
        return errors;
      },
    },
  };
}
