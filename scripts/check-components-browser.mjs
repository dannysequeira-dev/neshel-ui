// pnpm check:browser:components --consumers <dir> [--variant <name>]... [--report <file>]
// Feature 005 interaction, theme, breakpoint, hydration and axe checks in headless Chrome against
// the packed component consumers written by `check:consumer --artifacts <dir>` (FR-121, FR-122).
// Without a browser: fails when CI=true, otherwise prints SKIPPED and exits 0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { findBrowser, launchBrowser } from "./lib/cdp.mjs";
import { runComponentSuite } from "./lib/components-browser.mjs";
import { COMPONENT_VARIANTS } from "./lib/consumer-components.mjs";

function argValues(name) {
  const values = [];
  process.argv.forEach((arg, index) => {
    if (arg === name) values.push(process.argv[index + 1]);
  });
  return values;
}

async function main() {
  const consumers = argValues("--consumers")[0];
  if (!consumers)
    throw new Error("--consumers <dir> is required (written by check:consumer --artifacts)");
  const selected = argValues("--variant");
  const names = (selected.length ? selected : Object.keys(COMPONENT_VARIANTS)).filter((name) =>
    existsSync(join(resolve(consumers), name, "index.html")),
  );
  if (names.length === 0) throw new Error(`no component consumer builds found in ${consumers}`);
  const executable = findBrowser();
  if (!executable) {
    if (process.env.CI === "true")
      throw new Error("no Chrome/Chromium/Edge found on this CI runner");
    console.info(
      "check:browser:components SKIPPED (no Chrome, Chromium or Edge found; set NESHEL_CHROME)",
    );
    return;
  }
  const require = createRequire(import.meta.url);
  const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  const browser = await launchBrowser(executable);
  console.info(`Browser: ${browser.version}`);
  const failures = [];
  const report = { browser: browser.version, variants: {} };
  let passed = 0;
  let total = 0;
  try {
    for (const name of names) {
      const dir = join(resolve(consumers), name);
      const page = await browser.newPage();
      const result = await runComponentSuite(page, {
        name,
        labUrl: pathToFileURL(join(dir, "index.html")).href,
        shellUrl: pathToFileURL(join(dir, "shell.html")).href,
        params: COMPONENT_VARIANTS[name],
        axeSource,
      });
      passed += result.passed;
      total += result.cases.length;
      failures.push(...result.failures);
      report.variants[name] = result.cases;
      console.info(
        `${result.failures.length ? "FAIL" : "ok  "} ${name} — ${result.passed}/${result.cases.length} cases`,
      );
      for (const failure of result.failures) {
        console.error(`  ${failure}`);
        // GitHub annotations are readable without credentials (logs are not).
        if (process.env.GITHUB_ACTIONS === "true")
          console.log(
            `::error title=check:browser:components::${failure.replace(/[\r\n]+/g, " ")}`,
          );
      }
    }
  } finally {
    await browser.close();
  }
  const reportPath = argValues("--report")[0];
  if (reportPath) {
    mkdirSync(resolve(reportPath, ".."), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (failures.length) {
    console.error(`check:browser:components failed: ${failures.length} of ${total} cases.`);
    process.exitCode = 1;
  } else {
    console.info(`check:browser:components passed: ${passed} cases across ${names.join(", ")}.`);
  }
}

main().catch((error) => {
  console.error(`check:browser:components could not complete: ${error.message}`);
  process.exitCode = 1;
});
