// pnpm check:bundles [--update] [--report <file>]
// Feature 006 (release requirement R6, research R14): realistic per-family bundle sizes measured from
// the PACKED packages in an app outside the workspace. Each entry imports one family the way an
// application does; Vite (Rolldown) builds it minified with React external. Gzip sizes are compared
// with scripts/bundle-budgets.json (measured value + ~10 % headroom). Also keeps the tree-shaking
// proof: the Button-only bundle contains no Radix or Base UI code (positive control on the full
// bundle). --update rewrites the budgets from the current measurements (review the diff).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { pnpm } from "./lib/pnpm.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";
import { packPublicPackages, useTarballs } from "./pack-local.mjs";

const BUDGETS = join(repoRoot, "scripts", "bundle-budgets.json");
const C = "@neshel-ui/components";

/** Entry name → module source (what an application would write). */
export const ENTRIES = {
  "layout (all primitives)": `export * from "@neshel-ui/layout";`,
  "typography (all components)": `export * from "@neshel-ui/typography";`,
  "components: Button": `export { Button } from "${C}";`,
  "components: Card + Badge + Input + Label + Separator + Skeleton + VisuallyHidden": `export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction, Badge, Input, Label, Separator, Skeleton, VisuallyHidden } from "${C}";`,
  "components: Dialog": `export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "${C}";`,
  "components: AlertDialog": `export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "${C}";`,
  "components: Sheet": `export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription, SheetClose } from "${C}";`,
  "components: Popover + Tooltip": `export { Popover, PopoverTrigger, PopoverContent, PopoverClose, Tooltip, TooltipTrigger, TooltipContent } from "${C}";`,
  "components: Select": `export { Select } from "${C}";`,
  "components: MultiSelect": `export { MultiSelect } from "${C}";`,
  "components: Combobox": `export { Combobox } from "${C}";`,
  "components: Navbar": `export { Navbar, NavbarBrand, NavbarNav, NavbarLink, NavbarActions } from "${C}";`,
  "components: NavigationMenu": `export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from "${C}";`,
  "components: DropdownMenu": `export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "${C}";`,
  "components: MobileMenu": `export { MobileMenu, MobileMenuTrigger, MobileMenuContent, MobileMenuNav, MobileMenuLink } from "${C}";`,
  "components: AppShell + Sidebar": `export { AppShell, AppShellMain, AppShellContent, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarItem, SidebarSub, SidebarSeparator, SidebarTrigger, useAppShell } from "${C}";`,
  "components (entire library)": `export * from "${C}";`,
};

export const STYLESHEETS = {
  "config/tokens.css": "@neshel-ui/config/dist/tokens.css",
  "layout/styles.css": "@neshel-ui/layout/dist/styles.css",
  "typography/styles.css": "@neshel-ui/typography/dist/styles.css",
  "components/styles.css": "@neshel-ui/components/dist/styles.css",
};

const MARKERS = [
  "data-radix-focus-guard",
  "DismissableLayer",
  "FocusScope",
  "data-base-ui",
  "floating-ui",
];

const MEASURE = `import { build } from "vite";
import { readFileSync } from "node:fs";
const entries = JSON.parse(readFileSync("entries.json", "utf8"));
const out = {};
for (const [name, file] of Object.entries(entries)) {
  const [result] = [].concat(await build({
    configFile: false,
    logLevel: "silent",
    build: { write: false, minify: true, lib: { entry: file, formats: ["es"], fileName: "x" },
      rollupOptions: { external: ["react", "react/jsx-runtime", "react-dom"] } },
  }));
  out[name] = result.output.filter((c) => c.type === "chunk").map((c) => c.code).join("");
}
process.stdout.write(JSON.stringify(out));
`;

const kib = (bytes) => Math.round((bytes / 1024) * 100) / 100;

async function main() {
  const update = process.argv.includes("--update");
  const reportIndex = process.argv.indexOf("--report");
  const temp = createTempDir("neshel bundles ñ-");
  const results = {};
  const problems = [];
  try {
    const tarballs = join(temp.dir, "tarballs");
    packPublicPackages(tarballs);
    const app = join(temp.dir, "app");
    mkdirSync(app, { recursive: true });
    const react = JSON.parse(
      readFileSync(join(repoRoot, "node_modules", "react", "package.json"), "utf8"),
    ).version;
    const vite = JSON.parse(
      readFileSync(
        join(repoRoot, "apps", "playground-vite", "node_modules", "vite", "package.json"),
        "utf8",
      ),
    ).version;
    writeFileSync(
      join(app, "package.json"),
      `${JSON.stringify({ name: "neshel-bundles", private: true, type: "module", dependencies: { "@neshel-ui/config": "0", "@neshel-ui/layout": "0", "@neshel-ui/typography": "0", "@neshel-ui/components": "0", react, "react-dom": react }, devDependencies: { vite } }, null, 2)}\n`,
    );
    useTarballs(app, tarballs);
    const files = {};
    Object.entries(ENTRIES).forEach(([name, source], index) => {
      const file = `entry-${index}.js`;
      writeFileSync(join(app, file), `${source}\n`);
      files[name] = file;
    });
    writeFileSync(join(app, "entries.json"), JSON.stringify(files));
    writeFileSync(join(app, "measure.mjs"), MEASURE);
    console.info("Installing packed packages and Vite…");
    pnpm(["install", "--no-frozen-lockfile"], app, { isolated: true });
    const { spawnSync } = await import("node:child_process");
    const run = spawnSync(process.execPath, ["measure.mjs"], {
      cwd: app,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (run.status !== 0) throw new Error(`measurement failed:\n${run.stderr}`);
    const code = JSON.parse(run.stdout);
    for (const [name, source] of Object.entries(code)) {
      results[name] = {
        kind: "js",
        minified: Buffer.byteLength(source),
        gzip: gzipSync(source, { level: 9 }).length,
      };
    }
    for (const [name, path] of Object.entries(STYLESHEETS)) {
      const css = readFileSync(join(app, "node_modules", ...path.split("/")));
      results[name] = {
        kind: "css",
        minified: css.length,
        gzip: gzipSync(css, { level: 9 }).length,
      };
    }
    const button = code["components: Button"];
    const full = code["components (entire library)"];
    const buttonMarkers = MARKERS.filter((m) => button.includes(m));
    const fullMarkers = MARKERS.filter((m) => full.includes(m));
    if (buttonMarkers.length)
      problems.push(
        `Button-only bundle contains headless engine code (${buttonMarkers.join(", ")})`,
      );
    if (fullMarkers.length !== MARKERS.length)
      problems.push(`marker control failed: full bundle contains only ${fullMarkers.join(", ")}`);
  } finally {
    temp.dispose();
  }

  const budgets = update ? {} : JSON.parse(readFileSync(BUDGETS, "utf8")).budgets;
  console.info("\nGzip size (minified size), budget:");
  for (const [name, r] of Object.entries(results)) {
    if (update) budgets[name] = Math.ceil((r.gzip * 1.1) / 512) * 512;
    const budget = budgets[name];
    const ok = budget !== undefined && r.gzip <= budget;
    if (!ok)
      problems.push(
        budget === undefined
          ? `${name}: no budget`
          : `${name}: ${r.gzip} B gzip exceeds the budget of ${budget} B`,
      );
    console.info(
      `  ${ok ? "✓" : "✗"} ${name}: ${kib(r.gzip)} KiB (${kib(r.minified)} KiB)${budget ? ` ≤ ${kib(budget)} KiB` : ""}`,
    );
  }
  if (update) {
    writeFileSync(
      BUDGETS,
      `${JSON.stringify({ $comment: "Gzip byte budgets per bundle (measured from packed packages + ~10% headroom, rounded up to 512 B). Regenerate with pnpm check:bundles --update and review the diff.", budgets }, null, 2)}\n`,
    );
    console.info(`\nWrote ${BUDGETS}`);
  }
  if (reportIndex !== -1)
    writeFileSync(process.argv[reportIndex + 1], `${JSON.stringify(results, null, 2)}\n`);
  if (problems.length && !update) {
    for (const p of problems) {
      console.error(`✗ ${p}`);
      if (process.env.GITHUB_ACTIONS === "true") console.log(`::error title=check:bundles::${p}`);
    }
    process.exitCode = 1;
  } else if (!update)
    console.info(
      "\ncheck:bundles: all bundles within budget; Button-only bundle free of Radix/Base UI.",
    );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
