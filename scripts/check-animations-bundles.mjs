// pnpm check:animations:bundles [--no-build] [--report <file>]
// Phase 009 (spec FR-063, SC-003; owner-approved budgets), Phase 010 (FR-073; family entries,
// representative imports and stylesheets, budgets proposed from measurements), Phase 011 and Phase 012
// (FR-054; gestures/layout entries): bundle sizes of @neshel-ui/animations
// measured from its REAL packed tarball (pnpm pack → extracted outside the workspace), built with
// Vite (Rolldown) minified, React external, gzip-compressed. Offline: Vite comes from the
// playground's installed dependencies; @radix-ui/react-slot is linked from the workspace install.
// Budgets: scripts/animations-bundle-budgets.json. Also asserts tree-shaking markers per entry.
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { packPackage, pnpm } from "./lib/pnpm.mjs";
import { readTarGz } from "./lib/tar.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

const PACKAGE = join(repoRoot, "packages", "animations");
const BUDGETS = JSON.parse(
  readFileSync(join(repoRoot, "scripts", "animations-bundle-budgets.json"), "utf8"),
);
const A = "@neshel-ui/animations";

/** Entry → source and markers that must (true) or must not (false) appear in the bundle. */
export const ENTRIES = {
  "core (entire entry)": {
    source: `export * from "${A}/core";`,
    markers: { react: false, slot: false },
  },
  "registry + host (defineEffect, createEffectRegistry, attachEffect)": {
    source: `export { defineEffect, createEffectRegistry, attachEffect } from "${A}/core";`,
    markers: {
      react: false,
      slot: false,
      waapi: false,
      easing: false,
      arbiter: true,
      devWarnings: true,
    },
  },
  composeTransform: {
    source: `export { composeTransform } from "${A}/core";`,
    markers: { scheduler: false },
  },
  "controllers (motionValue, animateValue)": {
    source: `export { motionValue, animateValue } from "${A}/core";`,
    markers: { react: false, waapi: false },
  },
  "hover: Tilt3D": {
    source: `export { Tilt3D } from "${A}/hover";`,
    markers: { react: true, slot: true, waapi: false, arbiter: false },
  },
  "hover: createTilt3D (no React)": {
    source: `export { createTilt3D } from "${A}/hover";`,
    markers: { react: false, slot: false, arbiter: false },
  },
  // Informational, not budgeted: an application production build replaces process.env.NODE_ENV,
  // which must remove development diagnostics (warning strings) from the bundle.
  "registry + host, production define (info)": {
    source: `export { defineEffect, createEffectRegistry, attachEffect } from "${A}/core";`,
    markers: { devWarnings: false, arbiter: true },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  },
  "root: React bindings": {
    source: `export * from "${A}";`,
    markers: { slot: false, tilt: false },
  },
  // Phase 010 (FR-073).
  "core: definePreset + attachPreset": {
    source: `export { definePreset, attachPreset } from "${A}/core";`,
    markers: { react: false, slot: false, waapi: false },
  },
  "entrance: Reveal + fadeUp": {
    source: `export { Reveal, fadeUp } from "${A}/entrance";`,
    markers: {
      react: true,
      slot: true,
      waapi: false,
      tilt: false,
      hoverCode: false,
      pressCode: false,
    },
  },
  "entrance: fadeIn definition (no React)": {
    source: `export { fadeIn } from "${A}/entrance";`,
    markers: { react: false, slot: false, waapi: false },
  },
  "entrance: entire entry": {
    source: `export * from "${A}/entrance";`,
    markers: { tilt: false, hoverCode: false, pressCode: false },
  },
  "hover: Hover + lift": {
    source: `export { Hover, lift } from "${A}/hover";`,
    markers: { react: true, slot: true, waapi: false, tilt: false, pressCode: false },
  },
  "hover: lift definition (no React)": {
    source: `export { lift } from "${A}/hover";`,
    markers: { react: false, slot: false, tilt: false },
  },
  "hover: entire entry": {
    source: `export * from "${A}/hover";`,
    markers: { pressCode: false },
  },
  "press: Press + pressScale": {
    source: `export { Press, pressScale } from "${A}/press";`,
    markers: { react: true, slot: true, waapi: false, tilt: false, hoverCode: false },
  },
  "press: ripple definition (no React)": {
    source: `export { ripple } from "${A}/press";`,
    markers: { react: false, slot: false, waapi: true },
  },
  "press: NumberTick": {
    source: `export { NumberTick } from "${A}/press";`,
    markers: { react: true, waapi: false, hoverCode: false },
  },
  "press: entire entry": {
    source: `export * from "${A}/press";`,
    markers: { tilt: false, hoverCode: false },
  },
  // Phase 011 (FR-045): scroll family.
  "scroll: createScrollProgress (engine, no React)": {
    source: `export { createScrollProgress } from "${A}/scroll";`,
    markers: { react: false, slot: false, waapi: false, entranceCode: false, hoverCode: false },
  },
  "scroll: depthParallax definition (no React)": {
    source: `export { depthParallax } from "${A}/scroll";`,
    markers: { react: false, slot: false, waapi: false, entranceCode: false },
  },
  "scroll: revealOnEnter definition (no React)": {
    source: `export { revealOnEnter } from "${A}/scroll";`,
    markers: { react: false, slot: false, entranceCode: false, hoverCode: false },
  },
  "scroll: ScrollScene + ScrollLayer": {
    source: `export { ScrollScene, ScrollLayer } from "${A}/scroll";`,
    markers: { react: true, entranceCode: false, hoverCode: false, pressCode: false },
  },
  "scroll: RevealOnScroll": {
    source: `export { RevealOnScroll } from "${A}/scroll";`,
    markers: { react: true, entranceCode: false, hoverCode: false, pressCode: false },
  },
  "scroll: HorizontalScroll": {
    source: `export { HorizontalScroll } from "${A}/scroll";`,
    markers: { react: true, entranceCode: false, hoverCode: false, pressCode: false },
  },
  "scroll: entire entry": {
    source: `export * from "${A}/scroll";`,
    markers: { tilt: false, entranceCode: false, hoverCode: false, pressCode: false },
  },
  // Phase 012 (FR-054): gestures, layout, H11, P11.
  "gestures: createGesture (engine, no React)": {
    source: `export { createGesture } from "${A}/gestures";`,
    markers: { react: false, slot: false, waapi: false, layoutCode: false, hoverCode: false },
  },
  "gestures: physics primitives (decay, rubber band, snap, velocity)": {
    source: `export { stepDecay, projectDecay, rubberband, nearestSnap, createVelocityTracker } from "${A}/gestures";`,
    markers: { react: false, scheduler: false, arbiter: false },
  },
  "gestures: drag definition (no React)": {
    source: `export { drag } from "${A}/gestures";`,
    markers: { react: false, slot: false, waapi: false, layoutCode: false },
  },
  "gestures: pinchZoom + rotateGesture (no React)": {
    source: `export { pinchZoom, rotateGesture } from "${A}/gestures";`,
    markers: { react: false, slot: false, layoutCode: false },
  },
  "gestures: Reorder components": {
    source: `export { Reorder, ReorderItem, ReorderHandle } from "${A}/gestures";`,
    markers: { react: true, layoutCode: false, hoverCode: false, pressCode: false },
  },
  "gestures: Gesture + drag": {
    source: `export { Gesture, drag } from "${A}/gestures";`,
    markers: { react: true, slot: true, layoutCode: false },
  },
  "gestures: entire entry": {
    source: `export * from "${A}/gestures";`,
    markers: {
      tilt: false,
      layoutCode: false,
      hoverCode: false,
      pressCode: false,
      entranceCode: false,
    },
  },
  "layout: createLayoutGroup + flipMove (no React)": {
    source: `export { createLayoutGroup, flipMove } from "${A}/layout";`,
    markers: { react: false, slot: false, gesturesCode: false },
  },
  "layout: Presence": {
    source: `export { Presence } from "${A}/layout";`,
    markers: { react: true, gesturesCode: false, entranceCode: false },
  },
  "layout: LayoutGroup + LayoutItem": {
    source: `export { LayoutGroup, LayoutItem } from "${A}/layout";`,
    markers: { react: true, gesturesCode: false },
  },
  "layout: entire entry": {
    source: `export * from "${A}/layout";`,
    markers: { gesturesCode: false, hoverCode: false, pressCode: false, entranceCode: false },
  },
  "hover: cursorFollower definition (no React)": {
    source: `export { cursorFollower } from "${A}/hover";`,
    markers: { react: false, slot: false, tilt: false },
  },
  "press: longPress definition (no React)": {
    source: `export { longPress } from "${A}/press";`,
    markers: { react: false, slot: false, hoverCode: false },
  },
};

/** Stylesheets measured from the packed tarball (gzip of the file as shipped). */
export const STYLESHEETS = [
  "dist/hover.css",
  "dist/press.css",
  "dist/scroll.css",
  "dist/styles.css",
  "dist/gestures.css",
  "dist/layout.css",
];

const MARKERS = {
  react: (code) => /from\s*["']react/.test(code),
  slot: (code) => /react-slot|createSlot|Slottable/.test(code),
  waapi: (code) => /\.animate(?:\?\.)?\(/.test(code),
  scheduler: (code) => /requestAnimationFrame/.test(code),
  tilt: (code) => /data-neshel-tilt/.test(code),
  easing: (code) => /cubic-bezier\(/.test(code),
  arbiter: (code) => /is suspended/.test(code),
  devWarnings: (code) => /changed outside the engine/.test(code),
  // Family fingerprints (strings that only that family's code contains).
  hoverCode: (code) => /hover\/lift|hover\/glow|hover\/spotlight/.test(code),
  pressCode: (code) => /press\/scale|press\/ripple|press\/number-tick/.test(code),
  entranceCode: (code) => /entrance\/fade-in|entrance\/fade-slide|entrance\/clip-reveal/.test(code),
  gesturesCode: (code) => /physics\/drag|physics\/pinch-zoom|physics\/reorder/.test(code),
  layoutCode: (code) => /layout\/flip|layout\/collapse|layout\/masonry/.test(code),
};

function link(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  symlinkSync(realpathSync(from), to, "junction");
}

async function main() {
  if (!process.argv.includes("--no-build")) pnpm(["--filter", A, "build"], repoRoot);
  const requireFromPlayground = createRequire(
    join(repoRoot, "apps", "playground-vite", "package.json"),
  );
  const { build } = await import(pathToFileURL(requireFromPlayground.resolve("vite")).href);
  const { dir, dispose } = createTempDir("neshel animations bundles ñ-", {
    keep: process.argv.includes("--keep"),
  });
  if (process.argv.includes("--keep")) console.info(`keeping ${dir}`);
  const results = {};
  const failures = [];
  try {
    const tarball = readFileSync(packPackage(PACKAGE, join(dir, "tarball")));
    const target = join(dir, "app", "node_modules", "@neshel-ui", "animations");
    for (const [path, contents] of readTarGz(tarball)) {
      const file = join(target, ...path.replace(/^package\//, "").split("/"));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, contents);
    }
    for (const sheet of STYLESHEETS) {
      const code = readFileSync(join(target, ...sheet.split("/")));
      const name = `css: ${sheet.replace("dist/", "")}`;
      const gzip = gzipSync(code, { level: 9 }).length;
      const budget = BUDGETS[name];
      results[name] = {
        minBytes: code.length,
        gzipBytes: gzip,
        budgetBytes: budget ?? null,
        markers: {},
      };
      if (budget !== undefined && gzip > budget)
        failures.push(`${name}: ${gzip} B gzip > budget ${budget} B`);
      console.info(
        `${budget !== undefined && gzip > budget ? "FAIL" : "ok  "} ${name} — ${(gzip / 1024).toFixed(2)} KiB gzip (${code.length} B raw)${budget !== undefined ? ` / budget ${(budget / 1024).toFixed(2)} KiB` : ""}`,
      );
    }
    link(
      join(PACKAGE, "node_modules", "@radix-ui", "react-slot"),
      join(dir, "app", "node_modules", "@radix-ui", "react-slot"),
    );
    for (const [name, { source, markers, define }] of Object.entries(ENTRIES)) {
      const slug = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const entry = join(dir, "app", `${slug}.js`);
      writeFileSync(entry, source);
      const outDir = join(dir, "app", "out", slug);
      await build({
        configFile: false,
        logLevel: "silent",
        root: join(dir, "app"),
        ...(define ? { define } : {}),
        build: {
          outDir,
          emptyOutDir: true,
          minify: true,
          lib: { entry, formats: ["es"], fileName: "out" },
          rollupOptions: { external: [/^react($|\/)/, /^react-dom($|\/)/] },
        },
      });
      const file = readdirSync(outDir).find((item) => /.m?js$/.test(item));
      const code = readFileSync(join(outDir, file));
      const text = code.toString("utf8");
      const gzip = gzipSync(code, { level: 9 }).length;
      const budget = BUDGETS[name];
      const markerResults = Object.fromEntries(
        Object.keys(markers).map((marker) => [marker, MARKERS[marker](text)]),
      );
      results[name] = {
        minBytes: code.length,
        gzipBytes: gzip,
        budgetBytes: budget ?? null,
        markers: markerResults,
      };
      if (budget !== undefined && gzip > budget)
        failures.push(`${name}: ${gzip} B gzip > budget ${budget} B`);
      for (const [marker, expected] of Object.entries(markers)) {
        if (markerResults[marker] !== expected) {
          failures.push(
            `${name}: marker "${marker}" ${expected ? "missing" : "present"} (tree-shaking)`,
          );
        }
      }
      const status = budget !== undefined && gzip > budget ? "FAIL" : "ok  ";
      console.info(
        `${status} ${name} — ${(gzip / 1024).toFixed(2)} KiB gzip (${code.length} B min)${budget !== undefined ? ` / budget ${(budget / 1024).toFixed(2)} KiB` : ""}`,
      );
    }
  } finally {
    dispose();
  }
  const reportIndex = process.argv.indexOf("--report");
  if (reportIndex !== -1)
    writeFileSync(process.argv[reportIndex + 1], `${JSON.stringify(results, null, 2)}\n`);
  if (failures.length) {
    for (const failure of failures) console.error(`ERROR ${failure}`);
    process.exitCode = 1;
  } else {
    console.info(
      "check:animations:bundles passed (packed tarball, budgets and tree-shaking markers).",
    );
  }
}

main().catch((error) => {
  console.error(`check:animations:bundles could not complete: ${error.message}`);
  process.exitCode = 1;
});
