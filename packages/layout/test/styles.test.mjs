// Distributed stylesheet: drift (C3), runtime/stylesheet consistency (C1, C2), hygiene, budget.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { findDrift, renderPackage } from "../../../scripts/generate-component-css.mjs";
import {
  checkLayoutStylesheet,
  missingFromStylesheet,
  neshelClasses,
  stylesheetClasses,
  unreachableClasses,
} from "../../../scripts/lib/layout-css.mjs";
import { h, layout, markup } from "./helpers.mjs";

const css = readFileSync(new URL("../dist/styles.css", import.meta.url), "utf8");
const source = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tables = await import("../dist/style-tables.js");

const BREAKPOINTS = ["base", "sm", "md", "lg", "xl", "2xl"];
const SPACE = [...tables.spaceScale];

/** Allowed values per component prop (mirrors contracts/layout-api.md). */
const sweep = {
  Box: { display: ["none", "block", "inline", "inline-block"] },
  Flex: {
    space: SPACE,
    spaceX: SPACE,
    spaceY: SPACE,
    direction: ["row", "column", "row-reverse", "column-reverse"],
    wrap: [true, false],
    align: ["start", "center", "end"],
    alignX: ["start", "center", "end"],
    // In the default row direction Y is the cross axis, so stretch/baseline are valid there.
    alignY: ["start", "center", "end", "stretch", "baseline"],
    justify: ["start", "center", "end", "between", "around", "evenly"],
  },
  Stack: {
    space: SPACE,
    align: ["start", "center", "end"],
    alignX: ["start", "center", "end", "stretch"],
    alignY: ["start", "center", "end"],
    justify: ["start", "center", "end", "between", "around", "evenly"],
  },
  Inline: {
    spaceX: SPACE,
    spaceY: SPACE,
    alignY: ["start", "center", "end", "stretch", "baseline"],
    wrap: [true, false],
  },
  Grid: {
    columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    align: ["start", "center", "end", "stretch"],
  },
  Center: { alignX: ["start", "center", "end"], alignY: ["start", "center", "end", "baseline"] },
  Container: { size: ["sm", "md", "lg", "xl", "2xl", "full"], gutter: SPACE },
};

function classAttr(element) {
  return [...markup(element).matchAll(/class="([^"]*)"/g)].map((match) => match[1]);
}

/** Render every allowed value at every breakpoint, plus the Flex reset paths and separators. */
function sweepClasses() {
  const used = [];
  let renders = 0;
  for (const [name, props] of Object.entries(sweep)) {
    const Component = layout[name];
    used.push(...neshelClasses(classAttr(h(Component))));
    for (const [prop, values] of Object.entries(props)) {
      for (const value of values) {
        for (const bp of BREAKPOINTS) {
          used.push(...neshelClasses(classAttr(h(Component, { [prop]: { [bp]: value } }))));
          renders++;
          if (bp === "base") continue;
          // Also change *to* the value from a different base (reaches values equal to defaults).
          const other = values.find((candidate) => candidate !== value);
          const element = h(Component, { [prop]: { base: other, [bp]: value } });
          used.push(...neshelClasses(classAttr(element)));
          renders++;
        }
      }
    }
  }
  // Values only valid on some components (Flex column cross axis, Grid/Stack stretch).
  for (const bp of BREAKPOINTS) {
    for (const value of ["stretch", "baseline"]) {
      const element = h(layout.Flex, { direction: "column", alignX: { [bp]: value } });
      used.push(...neshelClasses(classAttr(element)));
      renders++;
    }
  }
  for (const Component of [layout.Stack, layout.Inline]) {
    used.push(...neshelClasses(classAttr(h(Component, { separator: true }, "a", "b"))));
  }
  return { used: [...new Set(used)], renders };
}

test("committed src/styles.css equals the generator output (C3) and dist copies it", async () => {
  assert.deepEqual(
    await findDrift(["layout"]),
    [],
    "run pnpm build:packages && pnpm generate:component-css",
  );
  assert.equal(css, source);
});

test("every class emitted by the runtime has a rule, and every rule is reachable (C1, C2)", () => {
  const { used, renders } = sweepClasses();
  assert.ok(renders > 1000, `sweep too small (${renders} renders)`);
  assert.deepEqual(missingFromStylesheet(used, css), []);
  assert.deepEqual(unreachableClasses(used, css), []);
  assert.equal(stylesheetClasses(css).length, used.length);
});

test("negative control: the consistency checks detect a removed rule and a stray rule", () => {
  const { used } = sweepClasses();
  const removed = css.replace(/^\s*\.neshel-md-gap-4 \{[^}]*\}\n/m, "");
  assert.notEqual(removed, css);
  assert.deepEqual(missingFromStylesheet(used, removed), ["neshel-md-gap-4"]);
  const extra = css.replace(
    "@layer components.neshel {",
    "@layer components.neshel {\n  .neshel-gap-7 { gap: 7px; }",
  );
  assert.deepEqual(unreachableClasses(used, extra), ["neshel-gap-7"]);
});

test("each responsive class lives in the media block of its breakpoint, in ascending order", () => {
  const blocks = css.split(/@media \(min-width: ([\d.]+rem)\) \{/);
  assert.equal(blocks.length, 1 + 2 * 5);
  const widths = blocks.filter((_, index) => index % 2 === 1);
  assert.deepEqual(widths, ["40rem", "48rem", "64rem", "80rem", "96rem"]);
  const names = ["sm", "md", "lg", "xl", "2xl"];
  for (const name of stylesheetClasses(blocks[0])) {
    assert.ok(!names.some((bp) => name.startsWith(`neshel-${bp}-`)), `${name} outside its block`);
  }
  names.forEach((bp, index) => {
    for (const name of stylesheetClasses(blocks[2 + index * 2])) {
      assert.ok(name.startsWith(`neshel-${bp}-`), `${name} in the ${bp} block`);
    }
  });
});

test("stylesheet hygiene: layered, class selectors only, no Tailwind directives (FR-041, FR-045)", () => {
  assert.deepEqual(checkLayoutStylesheet(css), []);
  assert.match(css, /^\/\* @neshel-ui\/layout styles\./);
  assert.match(css, /:root \{ --neshel-breakpoints: "sm md lg xl 2xl"; \}/);
  assert.match(css, /\.neshel-separator \{[^}]*var\(--neshel-border\)/);
  assert.match(css, /\.neshel-gap-4 \{ gap: calc\(var\(--neshel-spacing\) \* 4\); \}/);
});

test("negative control: hygiene check rejects directives, element selectors and colours", () => {
  const broken = [
    css.replace("@layer components.neshel {", "@layer neshel.layout {"),
    `${css}\n@source "../src";`,
    css.replace(".neshel-flex {", "div {"),
    css.replace("var(--neshel-border)", "#e2dcd3"),
  ];
  for (const sample of broken) assert.ok(checkLayoutStylesheet(sample).length > 0);
});

test("stylesheet is deterministic and within the size budget (FR-044, SC-006)", async () => {
  const [first, second] = [await renderPackage("layout"), await renderPackage("layout")];
  assert.deepEqual(first.files, second.files);
  const raw = Buffer.byteLength(css);
  const gzip = gzipSync(css).byteLength;
  assert.ok(raw <= 48 * 1024, `raw ${raw} bytes > 48 KiB`);
  assert.ok(gzip <= 8 * 1024, `gzip ${gzip} bytes > 8 KiB`);
  console.info(`styles.css: ${raw} bytes raw, ${gzip} bytes gzip`);
});

test("the style manifest matches the tables and renders to the shipped stylesheet (FR-011)", async () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../dist/style-manifest.json", import.meta.url), "utf8"),
  );
  const { manifest: expected } = await renderPackage("layout");
  assert.deepEqual(manifest, JSON.parse(JSON.stringify(expected)));
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.package, "@neshel-ui/layout");
  const classes = new Set(manifest.responsive.map((rule) => rule.class));
  for (const removed of ["ai-center", "jc-center", "ji-center"]) assert.ok(!classes.has(removed));
  for (const added of ["align-x-center", "align-y-baseline", "justify-between", "dir-column"]) {
    assert.ok(classes.has(added), added);
  }
});
