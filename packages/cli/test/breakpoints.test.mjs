// Breakpoint validation, resolution, rendering and declarations (feature 004, FR-001–FR-012).
import assert from "node:assert/strict";
import test from "node:test";
import { RESERVED_NAMES, resolveBreakpoints, validateBreakpoints } from "../dist/breakpoints.js";
import {
  escapeClass,
  manifestProblems,
  renderComponentCss,
  responsiveClass,
} from "../dist/generate/components.js";
import { generateCss } from "../dist/generate/css.js";
import { generateDeclarations, isGeneratedDeclarations } from "../dist/generate/declarations.js";
import { resolveConfig } from "../dist/resolve.js";

const codes = (value) => validateBreakpoints(value).map((d) => `${d.severity}:${d.code}`);

test("valid extend and replace configurations produce no diagnostics", () => {
  assert.deepEqual(codes({ values: { phone: "30rem", wide3: "120rem" } }), []);
  assert.deepEqual(
    codes({
      mode: "replace",
      values: {
        phone: "30rem",
        phoneXL: "40rem",
        tablet: "48rem",
        laptop: "64rem",
        desktop: "80rem",
        wide: "96rem",
      },
      tailwind: true,
    }),
    [],
  );
  assert.deepEqual(codes({ mode: "replace", values: { md: "30rem", sm: "40rem" } }), []);
});

test("shape problems are reported", () => {
  assert.deepEqual(codes("48rem"), ["error:invalid-type"]);
  assert.deepEqual(codes({}), ["error:invalid-type"]);
  assert.deepEqual(codes({ values: {}, mode: "merge" }), ["error:invalid-type"]);
  assert.deepEqual(codes({ values: {}, tailwind: "yes" }), ["error:invalid-type"]);
  assert.deepEqual(codes({ values: {}, screens: {} }), ["error:unknown-key"]);
  assert.deepEqual(codes({ mode: "replace", values: {} }), ["error:empty-breakpoints"]);
});

test("names: grammar, length, reserved words, defaults in extend mode", () => {
  for (const bad of ["Phone", "phone-xl", "phone_xl", "2xl2", "", "x".repeat(25), "ñandú"]) {
    assert.deepEqual(codes({ values: { [bad]: "30rem" } }), ["error:invalid-breakpoint-name"], bad);
  }
  for (const reserved of ["base", "text", "gap", "dark", "print", "constructor", "max"]) {
    assert.ok(RESERVED_NAMES.includes(reserved));
    assert.deepEqual(
      codes({ mode: "replace", values: { [reserved]: "30rem" } }),
      ["error:reserved-breakpoint-name"],
      reserved,
    );
  }
  assert.deepEqual(codes({ values: { md: "30rem" } }), ["error:breakpoint-redefined"]);
  assert.deepEqual(codes({ values: { phoneXL: "30rem" } }), []);
});

test("names are unique ignoring case (quirks-mode class matching)", () => {
  assert.deepEqual(codes({ values: { phonexl: "30rem", phoneXl: "35rem" } }), [
    "error:duplicate-breakpoint-name",
  ]);
  assert.deepEqual(codes({ values: { lG: "30rem" } }), ["error:duplicate-breakpoint-name"]);
});

test("widths: rem only, bounds, decimals, distinct", () => {
  for (const bad of [
    "768px",
    "48em",
    "48",
    "48 rem",
    "-1rem",
    "0rem",
    "321rem",
    "1.23456rem",
    "01rem",
    48,
  ]) {
    assert.deepEqual(
      codes({ values: { phone: bad } }),
      ["error:invalid-breakpoint-width"],
      String(bad),
    );
  }
  assert.deepEqual(codes({ values: { phone: "47.5rem" } }), []);
  assert.deepEqual(codes({ values: { phone: "48rem" } }), ["error:duplicate-breakpoint-width"]);
  assert.deepEqual(codes({ mode: "replace", values: { a: "30rem", b: "30.0rem" } }), [
    "error:duplicate-breakpoint-width",
  ]);
});

test("too many breakpoints and declaration order", () => {
  const values = Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [`custom${String.fromCharCode(97 + i)}`, `${100 + i}rem`]),
  );
  assert.deepEqual(codes({ values }), ["error:too-many-breakpoints"]);
  const order = validateBreakpoints({ values: { wide3: "120rem", phone: "30rem" } });
  assert.deepEqual(
    order.map((d) => `${d.severity}:${d.code}`),
    ["warning:breakpoint-order"],
  );
  assert.match(order[0].message, /phone < wide3/);
});

test("resolution sorts by width; extend keeps defaults, replace drops them", () => {
  const extend = resolveBreakpoints({
    values: { phone: "30rem", wide3: "120rem", tablet: "52rem" },
  });
  assert.deepEqual(
    extend.list.map((bp) => bp.name),
    ["phone", "sm", "md", "tablet", "lg", "xl", "2xl", "wide3"],
  );
  assert.equal(extend.mode, "extend");
  assert.equal(extend.tailwind, false);
  const replace = resolveBreakpoints({
    mode: "replace",
    values: { wide: "96rem", phone: "30rem" },
    tailwind: true,
  });
  assert.deepEqual(
    replace.list.map((bp) => [bp.name, bp.width, bp.source]),
    [
      ["phone", "30rem", "config"],
      ["wide", "96rem", "config"],
    ],
  );
});

const manifest = {
  schema: 1,
  package: "@neshel-ui/example",
  version: "1.2.3",
  layer: "components.neshel",
  rules: [{ selector: ".neshel-x", declarations: [["display", "flex"]] }],
  responsive: [
    { class: "gap-4", declarations: [["gap", "1rem"]] },
    { class: "gap-0.5", declarations: [["gap", "0.125rem"]] },
  ],
};

test("renderComponentCss: registry, base rules, ascending media blocks, escaping", () => {
  const css = renderComponentCss(manifest, [
    { name: "phone", width: "30rem" },
    { name: "phoneXL", width: "40rem" },
  ]);
  assert.equal(
    css,
    `@layer components.neshel {
  :root { --neshel-breakpoints: "phone phoneXL"; }
  .neshel-x { display: flex; }

  .neshel-gap-4 { gap: 1rem; }
  .neshel-gap-0\\.5 { gap: 0.125rem; }

  @media (min-width: 30rem) {
    .neshel-phone-gap-4 { gap: 1rem; }
    .neshel-phone-gap-0\\.5 { gap: 0.125rem; }
  }

  @media (min-width: 40rem) {
    .neshel-phoneXL-gap-4 { gap: 1rem; }
    .neshel-phoneXL-gap-0\\.5 { gap: 0.125rem; }
  }
}
`,
  );
  assert.equal(responsiveClass("base", "gap-4"), "neshel-gap-4");
  assert.equal(responsiveClass("2xl", "gap-4"), "neshel-2xl-gap-4");
  assert.equal(escapeClass("neshel-gap-0.5"), "neshel-gap-0\\.5");
});

test("renderComponentCss schema 2: keyframes first, consecutive media rules grouped in order", () => {
  const css = renderComponentCss(
    {
      ...manifest,
      schema: 2,
      keyframes: [
        {
          name: "neshel-fade",
          frames: [
            { selector: "from", declarations: [["opacity", "0"]] },
            { selector: "to", declarations: [["opacity", "1"]] },
          ],
        },
      ],
      rules: [
        { selector: ".neshel-a", declarations: [["animation", "neshel-fade 1s"]] },
        {
          selector: ".neshel-a",
          declarations: [["animation", "none"]],
          media: "(prefers-reduced-motion: reduce)",
        },
        {
          selector: ".neshel-b",
          declarations: [["animation", "none"]],
          media: "(prefers-reduced-motion: reduce)",
        },
        { selector: ".neshel-c", declarations: [["display", "block"]] },
      ],
      responsive: [],
    },
    [],
  );
  assert.equal(
    css,
    `@layer components.neshel {
  :root { --neshel-breakpoints: ""; }
  @keyframes neshel-fade { from { opacity: 0; } to { opacity: 1; } }
  .neshel-a { animation: neshel-fade 1s; }
  @media (prefers-reduced-motion: reduce) {
    .neshel-a { animation: none; }
    .neshel-b { animation: none; }
  }
  .neshel-c { display: block; }

}
`,
  );
});

test("manifest validation: schema-2 fields are checked and refused in schema 1", () => {
  const v2 = { ...manifest, schema: 2 };
  assert.deepEqual(
    manifestProblems({
      ...v2,
      keyframes: [
        { name: "neshel-x", frames: [{ selector: "50%", declarations: [["opacity", "1"]] }] },
      ],
      rules: [
        { selector: ".neshel-x", declarations: [["opacity", "1"]], media: "(min-width: 10rem)" },
      ],
    }),
    [],
  );
  assert.match(
    manifestProblems({ ...manifest, keyframes: [] }).join(),
    /keyframes require schema 2/,
  );
  assert.match(
    manifestProblems({
      ...manifest,
      rules: [{ selector: ".a", declarations: [["opacity", "1"]], media: "(min-width: 1px)" }],
    }).join(),
    /media requires schema 2/,
  );
  for (const media of ["screen", "(a) { body", "(a);", "(min-width: 1px) /* x */"]) {
    assert.ok(
      manifestProblems({
        ...v2,
        rules: [{ selector: ".a", declarations: [["opacity", "1"]], media }],
      }).length > 0,
      media,
    );
  }
  for (const keyframes of [
    [{ name: "fade", frames: [{ selector: "from", declarations: [["opacity", "0"]] }] }],
    [{ name: "neshel-x", frames: [] }],
    [{ name: "neshel-x", frames: [{ selector: "middle", declarations: [["opacity", "0"]] }] }],
    [
      { name: "neshel-x", frames: [{ selector: "to", declarations: [["opacity", "0"]] }] },
      { name: "neshel-x", frames: [{ selector: "to", declarations: [["opacity", "0"]] }] },
    ],
  ]) {
    assert.ok(manifestProblems({ ...v2, keyframes }).length > 0, JSON.stringify(keyframes));
  }
});

test("manifest validation rejects incompatible or unsafe manifests", () => {
  assert.deepEqual(manifestProblems(manifest, "@neshel-ui/example"), []);
  assert.match(manifestProblems({ ...manifest, schema: 3 })[0], /unsupported schema 3/);
  assert.deepEqual(manifestProblems({ ...manifest, schema: 2 }), [], "schema 2 is a superset");
  assert.match(
    manifestProblems(manifest, "@neshel-ui/layout").join(),
    /expected "@neshel-ui\/layout"/,
  );
  assert.ok(manifestProblems({ ...manifest, layer: "neshel" }).length > 0);
  assert.ok(
    manifestProblems({
      ...manifest,
      rules: [{ selector: ".a } body { color: red", declarations: [["color", "red"]] }],
    }).length > 0,
  );
  assert.ok(
    manifestProblems({
      ...manifest,
      responsive: [{ class: "gap 4", declarations: [["gap", "1rem"]] }],
    }).length > 0,
  );
  assert.ok(
    manifestProblems({
      ...manifest,
      responsive: [{ class: "gap-4", declarations: [["gap", "1rem; color: red"]] }],
    }).length > 0,
  );
  assert.ok(
    manifestProblems({ ...manifest, responsive: [manifest.responsive[0], manifest.responsive[0]] })
      .length > 0,
  );
  assert.deepEqual(manifestProblems(null), ["the manifest is not a JSON object"]);
});

test("generated stylesheet: component sections and Tailwind theme only with breakpoints", () => {
  const header = "test";
  const plain = generateCss(resolveConfig({}), { layer: "config", header, components: [manifest] });
  assert.ok(!plain.includes("components.neshel"), "no component CSS without breakpoints");
  assert.ok(!plain.includes("@theme"));

  const replace = resolveConfig({
    breakpoints: { mode: "replace", values: { tablet: "48rem", phone: "30rem" }, tailwind: true },
  });
  const css = generateCss(replace, { layer: "config", header, components: [manifest] });
  assert.match(
    css,
    /\/\* @neshel-ui\/example 1\.2\.3 component styles \(breakpoints: phone tablet\) \*\/\n@layer components\.neshel \{/,
  );
  assert.ok(css.indexOf("min-width: 30rem") < css.indexOf("min-width: 48rem"));
  assert.ok(
    css.endsWith(`@theme {
  --breakpoint-*: initial;
  --breakpoint-phone: 30rem;
  --breakpoint-tablet: 48rem;
}
`),
  );

  const extend = resolveConfig({ breakpoints: { values: { phone: "30rem" }, tailwind: true } });
  const extended = generateCss(extend, { layer: "config", header, components: [manifest] });
  assert.ok(extended.endsWith("@theme {\n  --breakpoint-phone: 30rem;\n}\n"));
  assert.match(extended, /"phone sm md lg xl 2xl"/);
  const noTailwind = generateCss(resolveConfig({ breakpoints: { values: { phone: "30rem" } } }), {
    layer: "config",
    header,
  });
  assert.ok(!noTailwind.includes("@theme"));
});

test("declarations augment the registry with ascending names", () => {
  const text = generateDeclarations(
    resolveBreakpoints({ mode: "replace", values: { wide: "96rem", phoneXL: "40rem" } }),
    "neshel.config.ts",
  );
  assert.equal(
    text,
    `// Generated by "neshel generate" from neshel.config.ts; do not edit.
// Add this file to your TypeScript project ("include" or "files" in tsconfig.json).
export {};

declare module "@neshel-ui/config" {
  interface BreakpointRegistry {
    readonly names: "phoneXL" | "wide";
  }
}
`,
  );
  assert.ok(isGeneratedDeclarations(text));
  assert.ok(!isGeneratedDeclarations("// my own file\n"));
  const extend = generateDeclarations(resolveBreakpoints({ values: { phone: "30rem" } }), "c.ts");
  assert.match(extend, /"phone" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl";/);
});

test("renderComponentCss schema 2: supports conditions wrap rules and nest media (feature 006, R1)", () => {
  const css = renderComponentCss(
    {
      ...manifest,
      schema: 2,
      rules: [
        { selector: ".neshel-a", declarations: [["color", "var(--x)"]] },
        {
          selector: ".neshel-a",
          declarations: [["color", "var(--y)"]],
          supports: "not (color: light-dark(Canvas, CanvasText))",
        },
        {
          selector: ".neshel-b",
          declarations: [["color", "var(--z)"]],
          supports: "not (color: light-dark(Canvas, CanvasText))",
          media: "(prefers-color-scheme: dark)",
        },
      ],
      responsive: [],
    },
    [],
  );
  assert.equal(
    css,
    `@layer components.neshel {
  :root { --neshel-breakpoints: ""; }
  .neshel-a { color: var(--x); }
  @supports not (color: light-dark(Canvas, CanvasText)) {
    .neshel-a { color: var(--y); }
  }
  @supports not (color: light-dark(Canvas, CanvasText)) {
    @media (prefers-color-scheme: dark) {
      .neshel-b { color: var(--z); }
    }
  }

}
`,
  );
});

test("manifest validation: supports conditions need schema 2 and a safe feature query", () => {
  const rule = (supports) => ({
    selector: ".neshel-x",
    declarations: [["opacity", "1"]],
    supports,
  });
  assert.deepEqual(
    manifestProblems({
      ...manifest,
      schema: 2,
      rules: [rule("not (color: light-dark(Canvas, CanvasText))")],
    }),
    [],
  );
  assert.match(
    manifestProblems({ ...manifest, rules: [rule("(display: grid)")] }).join(),
    /supports requires schema 2/,
  );
  for (const bad of ["display: grid", "(a) { body", "(color: red);", "selector(:has(a))"]) {
    assert.match(
      manifestProblems({ ...manifest, schema: 2, rules: [rule(bad)] }).join(),
      /invalid supports condition/,
    );
  }
});
