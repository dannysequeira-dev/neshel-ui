// pnpm check:browser [--consumers <dir>] [--report <file>]
// Computed-style verification of theme precedence and cascade behaviour in a real headless
// browser (feature 002 FR-030, SC-005; contracts/css.md). Requires `pnpm build:packages`.
// --consumers points at the dist/ copies written by `check:consumer --artifacts <dir>`.
// Without a browser: fails when CI=true, otherwise prints SKIPPED and exits 0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  compareResults,
  expectationsFrom,
  fixturePage,
  hexToRgb,
  probeExpression,
  roleVariable,
  rowsFor,
} from "./lib/browser-matrix.mjs";
import { findBrowser, launchBrowser } from "./lib/cdp.mjs";
import { CONFIGURED_FIXTURE } from "./lib/consumer-configured.mjs";
import { CONSUMER_CASE_IDS } from "./lib/consumer-layout.mjs";
import {
  LAYOUT_CASES,
  layoutBody,
  orderChecks,
  probeLayout,
  TAILWIND_OVERRIDE_CASE,
  TAILWIND_STAND_IN,
} from "./lib/layout-browser.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

const configDist = join(repoRoot, "packages", "config", "dist");
const cliDist = join(repoRoot, "packages", "cli", "dist");
const layoutDist = join(repoRoot, "packages", "layout", "dist");
// Test-harness CSS only (not a library style): removes the UA body margin for geometry checks.
const HARNESS_CSS = "body { margin: 0; }";
const load = (path) => import(pathToFileURL(path).href);

// Same configuration as the "configured" consumer, so its computed values can be compared too.
const GENERATED_FIXTURE_CONFIG = CONFIGURED_FIXTURE;

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : resolve(process.argv[index + 1]);
}

function withPrimary(expected, value) {
  return Object.fromEntries(
    Object.entries(expected).map(([theme, entry]) => [
      theme,
      { ...entry, colors: { ...entry.colors, "--neshel-primary": hexToRgb(value) } },
    ]),
  );
}

async function main() {
  for (const required of [
    join(configDist, "tokens.css"),
    join(cliDist, "resolve.js"),
    join(layoutDist, "styles.css"),
  ]) {
    if (!existsSync(required)) throw new Error(`${required} is missing; run pnpm build:packages`);
  }
  const executable = findBrowser();
  if (!executable) {
    if (process.env.CI === "true")
      throw new Error("no Chrome/Chromium/Edge found on this CI runner");
    console.info("check:browser SKIPPED (no Chrome, Chromium or Edge found; set NESHEL_CHROME)");
    return;
  }

  const { colorRoles } = await load(join(configDist, "index.js"));
  const { resolveConfig } = await load(join(cliDist, "resolve.js"));
  const { generateCss } = await load(join(cliDist, "generate", "css.js"));
  const variables = colorRoles.map(roleVariable);
  const tokens = readFileSync(join(configDist, "tokens.css"), "utf8");
  const tailwind = readFileSync(join(configDist, "tailwind.css"), "utf8");
  const resolvedConfig = resolveConfig(GENERATED_FIXTURE_CONFIG);
  const generated = generateCss(resolvedConfig, { layer: "config", header: "browser fixture" });
  const defaultsExpected = expectationsFrom(resolveConfig({}).themes, colorRoles);
  const configuredExpected = expectationsFrom(resolvedConfig.themes, colorRoles);
  const builtIn = ["light", "dark"];
  const configuredThemes = resolvedConfig.themes.map((theme) => theme.name);

  const fixtures = [
    { name: "tokens.css", css: [tokens], expected: defaultsExpected, themes: builtIn },
    { name: "tailwind.css", css: [tailwind], expected: defaultsExpected, themes: builtIn },
    {
      name: "C1 tokens → generated",
      css: [tokens, generated],
      expected: configuredExpected,
      themes: configuredThemes,
    },
    {
      name: "C2 generated → tokens",
      css: [generated, tokens],
      expected: configuredExpected,
      themes: configuredThemes,
    },
    {
      name: "C2 generated → tailwind",
      css: [generated, tailwind],
      expected: configuredExpected,
      themes: configuredThemes,
    },
    {
      name: "C3 generated only",
      css: [generated],
      expected: configuredExpected,
      themes: configuredThemes,
    },
    {
      name: "C5 unlayered :root override",
      css: [tokens, ":root { --neshel-primary: #123456; }"],
      expected: withPrimary(defaultsExpected, "#123456"),
      rows: (rows) => rows.filter((row) => row.nested === null),
      themes: builtIn,
    },
    {
      name: "C6 documented @layer neshel.config override",
      css: [
        tokens,
        `@layer neshel.config {
  :root, [data-neshel-theme="light"], [data-neshel-theme="system"] { --neshel-primary: #2a4a80; }
  @media (prefers-color-scheme: dark) { [data-neshel-theme="system"] { --neshel-primary: #a9c2ee; } }
  [data-neshel-theme="dark"] { --neshel-primary: #a9c2ee; }
}`,
      ],
      expected: {
        light: withPrimary({ light: defaultsExpected.light }, "#2a4a80").light,
        dark: withPrimary({ dark: defaultsExpected.dark }, "#a9c2ee").dark,
      },
      themes: builtIn,
    },
    {
      name: "C7 consumer layer after neshel",
      css: [
        "@layer neshel, app;",
        tokens,
        "@layer app { :root, [data-neshel-theme] { --neshel-primary: #654321; } }",
      ],
      expected: withPrimary(defaultsExpected, "#654321"),
      themes: builtIn,
    },
    {
      // Negative control: a partial block in the higher layer leaks into dark (why FR-009
      // requires complete blocks). The harness must detect it, otherwise the check is vacuous.
      name: "negative control: partial neshel.config block",
      css: [tokens, "@layer neshel.config { :root { --neshel-primary: #000000; } }"],
      expected: defaultsExpected,
      themes: builtIn,
      expectFailure: true,
    },
  ];

  const consumersDir = argValue("--consumers");
  const consumerPages = [];
  if (consumersDir) {
    for (const name of ["tailwind", "plain", "configured"]) {
      const page = join(consumersDir, name, "index.html");
      if (!existsSync(page)) continue;
      consumerPages.push({
        name: `consumer:${name}`,
        url: pathToFileURL(page).href,
        expected: name === "configured" ? configuredExpected : defaultsExpected,
        themes: name === "configured" ? configuredThemes : builtIn,
        tailwind: name !== "plain",
        // Feature 003: the Tailwind and plain consumers render LayoutCases and hydrate SSR markup.
        layout: name !== "configured",
      });
    }
    if (consumerPages.length === 0) throw new Error(`no consumer builds found in ${consumersDir}`);
  }

  const { dir, dispose } = createTempDir("neshel browser ñ-");
  const browser = await launchBrowser(executable);
  const failures = [];
  const report = { browser: browser.version, platform: process.platform, fixtures: [] };
  let assertions = 0;
  try {
    console.info(`Browser: ${browser.version} (${executable})`);
    const pages = [
      ...fixtures.map((fixture, index) => {
        const file = join(dir, `fixture ${index} ñ.html`);
        writeFileSync(file, fixturePage(fixture.name, fixture.css));
        return { ...fixture, url: pathToFileURL(file).href };
      }),
      ...consumerPages,
    ];
    for (const fixture of pages) {
      const page = await browser.newPage();
      await page.goto(fixture.url);
      let rows = rowsFor(fixture.themes);
      if (fixture.rows) rows = fixture.rows(rows);
      const results = [];
      for (const os of ["light", "dark"]) {
        await page.emulateColorScheme(os);
        const subset = rows.filter((row) => row.os === os);
        if (subset.length)
          results.push(...(await page.evaluate(probeExpression(subset, variables))));
      }
      let fixtureFailures = compareResults(fixture.name, rows, results, fixture.expected);
      if (fixture.expectFailure) {
        const leaked = fixtureFailures.some((failure) => / row 4 .*--neshel-primary/.test(failure));
        fixtureFailures = leaked
          ? []
          : [
              `${fixture.name}: expected the partial block to leak into dark (row 4), but it did not`,
            ];
      }
      // Every row checks 3 elements × 21 roles plus colour-scheme assertions.
      const count = rows.length * (variables.length * 3 + 1) + rows.filter((r) => r.nested).length;
      assertions += count;

      if (fixture.tailwind) {
        // C8: utilities resolve to the active theme; C9: theme attribute beats scheme-* utility.
        await page.emulateColorScheme("light");
        const utility = await page.evaluate(`(() => {
  const out = {};
  for (const theme of ["light", "dark"]) {
    const el = document.createElement("div");
    el.setAttribute("data-neshel-theme", theme);
    el.className = "bg-neshel-primary";
    document.body.appendChild(el);
    out[theme] = getComputedStyle(el).backgroundColor;
    el.remove();
  }
  const both = document.createElement("div");
  both.setAttribute("data-neshel-theme", "dark");
  both.className = "scheme-light";
  document.body.appendChild(both);
  out.scheme = getComputedStyle(both).colorScheme;
  out.hasSchemeUtility = [...document.styleSheets].some((sheet) => {
    try { return [...sheet.cssRules].some((rule) => String(rule.cssText).includes(".scheme-light")); }
    catch { return false; }
  });
  both.remove();
  return out;
})()`);
        for (const theme of ["light", "dark"]) {
          const want = fixture.expected[theme].colors["--neshel-primary"];
          if (utility[theme] !== want) {
            fixtureFailures.push(
              `${fixture.name} C8 .bg-neshel-primary under ${theme}: got ${utility[theme]}, expected ${want}`,
            );
          }
        }
        if (fixture.name.startsWith("consumer:")) {
          if (!utility.hasSchemeUtility)
            fixtureFailures.push(`${fixture.name} C9: .scheme-light utility not present`);
          else if (utility.scheme !== "dark") {
            fixtureFailures.push(
              `${fixture.name} C9: color-scheme ${utility.scheme}, expected dark`,
            );
          }
          assertions += 1;
        }
        assertions += 2;
      }
      if (fixture.layout) {
        const result = await probeConsumerLayout(page, fixture);
        fixtureFailures.push(...result.failures);
        assertions += result.assertions;
      }
      failures.push(...fixtureFailures);
      report.fixtures.push({
        name: fixture.name,
        rows: rows.map((row) => row.id),
        failures: fixtureFailures,
      });
      console.info(
        `${fixtureFailures.length ? "FAIL" : "ok  "} ${fixture.name} — rows ${rows.map((r) => r.id).join(", ")}`,
      );
    }
    // Feature 003: layout computed styles on shipped CSS (SC-001) and import-order fixtures.
    const layoutResult = await runLayoutSection(browser, { dir, tokens });
    failures.push(...layoutResult.failures);
    assertions += layoutResult.assertions;
    report.layout = layoutResult.report;
  } finally {
    await browser.close();
    dispose();
  }

  report.assertions = assertions;
  report.failures = failures.length;
  const reportPath = argValue("--report");
  if (reportPath) {
    mkdirSync(resolve(reportPath, ".."), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (failures.length) {
    for (const failure of failures.slice(0, 50)) console.error(`ERROR ${failure}`);
    if (failures.length > 50) console.error(`… and ${failures.length - 50} more`);
    console.error(`check:browser failed: ${failures.length} of ${assertions} assertions.`);
    process.exitCode = 1;
  } else {
    console.info(`check:browser passed: ${assertions} computed-style assertions.`);
  }
}

/** Layout cases and hydration in a packed consumer page (SC-004). */
async function probeConsumerLayout(page, fixture) {
  const { defaults } = await load(join(configDist, "index.js"));
  const ctx = {
    border: {
      light: hexToRgb(defaults.themes.light.border),
      dark: hexToRgb(defaults.themes.dark.border),
    },
  };
  await page.emulateColorScheme("light");
  // The theme matrix above leaves attributes on <html>; layout cases expect the default theme.
  await page.evaluate(`document.documentElement.removeAttribute("data-neshel-theme")`);
  let state;
  for (let attempt = 0; attempt < 50; attempt++) {
    state = await page.evaluate(`({ ...document.documentElement.dataset })`);
    if (state.mounted === "true") break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const failures = [];
  if (state.hydrated !== "true")
    failures.push(`${fixture.name}: page was not hydrated from SSR markup`);
  if (state.mounted !== "true") failures.push(`${fixture.name}: React did not mount`);
  if (state.hydrationErrors)
    failures.push(`${fixture.name}: hydration errors: ${state.hydrationErrors}`);
  for (const error of page.errors) failures.push(`${fixture.name}: page error ${error}`);
  const cases = LAYOUT_CASES.filter((testCase) => CONSUMER_CASE_IDS.includes(testCase.id));
  if (fixture.tailwind) cases.push(TAILWIND_OVERRIDE_CASE);
  const result = await probeLayout(page, cases, ctx, fixture.name);
  await page.setViewport(1280, 900);
  return { failures: [...failures, ...result.failures], assertions: result.assertions + 4 };
}

async function runLayoutSection(browser, { dir, tokens }) {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const L = await load(join(layoutDist, "index.js"));
  const { defaults } = await load(join(configDist, "index.js"));
  const layoutCss = readFileSync(join(layoutDist, "styles.css"), "utf8");
  const ctx = {
    border: {
      light: hexToRgb(defaults.themes.light.border),
      dark: hexToRgb(defaults.themes.dark.border),
    },
  };
  const render = { h: React.createElement, L, render: renderToStaticMarkup };
  const pages = [
    { name: "layout: shipped CSS", css: [HARNESS_CSS, tokens, layoutCss], cases: LAYOUT_CASES },
    {
      name: "layout: canonical order (Tailwind stand-in first)",
      css: [HARNESS_CSS, TAILWIND_STAND_IN, tokens, layoutCss],
      cases: orderChecks(true),
    },
    {
      name: "layout: layout before Tailwind (documented limitation)",
      css: [HARNESS_CSS, layoutCss, TAILWIND_STAND_IN, tokens],
      cases: orderChecks(false),
    },
    {
      // Negative control: without the layout stylesheet the cases must fail.
      name: "layout negative control: no layout stylesheet",
      css: [HARNESS_CSS, tokens],
      cases: LAYOUT_CASES,
      expectFailure: true,
    },
  ];
  const failures = [];
  const report = [];
  let assertions = 0;
  for (const [index, entry] of pages.entries()) {
    const file = join(dir, `layout ${index} ñ.html`);
    const html = fixturePage(entry.name, entry.css).replace(
      "<body></body>",
      `<body>
${layoutBody(entry.cases, render)}
</body>`,
    );
    writeFileSync(file, html);
    const page = await browser.newPage();
    await page.goto(pathToFileURL(file).href);
    await page.emulateColorScheme("light");
    const result = await probeLayout(page, entry.cases, ctx, entry.name);
    let pageFailures = result.failures;
    if (entry.expectFailure) {
      pageFailures =
        result.failures.length > 0
          ? []
          : [`${entry.name}: expected failures without the layout stylesheet, got none`];
    }
    pageFailures.push(...page.errors.map((error) => `${entry.name}: page error ${error}`));
    assertions += result.assertions;
    failures.push(...pageFailures);
    report.push({ name: entry.name, cases: entry.cases.map((c) => c.id), failures: pageFailures });
    console.info(
      `${pageFailures.length ? "FAIL" : "ok  "} ${entry.name} — ${result.assertions} assertions`,
    );
  }
  return { failures, assertions, report };
}

main().catch((error) => {
  console.error(`check:browser could not complete: ${error.message}`);
  process.exitCode = 1;
});
