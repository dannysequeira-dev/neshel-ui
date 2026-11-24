// pnpm stress:overlays --consumers <dir> [--variant <name>]... [--engine <name>]... [--runs 30]
//   [--cpu-throttle <rate>] [--report <file>]
// K-15 (feature 017): repeats the nested-overlay Escape scenarios (check:browsers cases
// nested-overlays-escape-order and nested-overlays-rapid-escape) in fresh browser contexts against
// the packed component consumers written by `check:consumer --artifacts <dir>`. Every repetition is
// counted and reported; any failure fails the run (no retries). `--cpu-throttle` (Chromium only,
// CDP) slows the renderer to vary timing. Without installed engines: fails when CI=true.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { NESTED_OVERLAY_FLOWS } from "./lib/overlay-escape.mjs";
import { startStaticServer } from "./lib/static-server.mjs";

const argValues = (name) =>
  process.argv.flatMap((arg, index) => (process.argv[index - 1] === name ? [arg] : []));

async function main() {
  const consumers = argValues("--consumers")[0];
  if (!consumers) throw new Error("--consumers <dir> is required (check:consumer --artifacts)");
  const runs = Number(argValues("--runs")[0] ?? 30);
  if (!Number.isInteger(runs) || runs < 1) throw new Error("--runs must be a positive integer");
  const throttle = Number(argValues("--cpu-throttle")[0] ?? 1);
  const engines = argValues("--engine").length
    ? argValues("--engine")
    : ["chromium", "firefox", "webkit"];
  const variants = argValues("--variant").length ? argValues("--variant") : ["components-plain"];
  for (const variant of variants) {
    if (!existsSync(join(resolve(consumers), variant, "index.html")))
      throw new Error(`consumer build not found: ${variant}`);
  }
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    if (process.env.CI === "true") throw new Error("playwright is not installed");
    console.info("stress:overlays SKIPPED (playwright not installed)");
    return;
  }
  const report = { platform: process.platform, runs, throttle, results: [] };
  const failures = [];
  for (const engineName of engines) {
    const browser = await playwright[engineName].launch();
    const version = browser.version();
    for (const variant of variants) {
      const server = await startStaticServer(join(resolve(consumers), variant));
      for (const [id, flow] of Object.entries(NESTED_OVERLAY_FLOWS)) {
        let passed = 0;
        const errors = [];
        for (let run = 1; run <= runs; run++) {
          const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
          const page = await context.newPage();
          const pageErrors = [];
          page.on("pageerror", (error) => pageErrors.push(error.message));
          try {
            if (throttle > 1 && engineName === "chromium") {
              const cdp = await context.newCDPSession(page);
              await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
            }
            await flow({
              page,
              base: server.origin,
              check: (condition, message) => {
                if (!condition) throw new Error(message);
              },
            });
            if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(" | ")}`);
            passed++;
          } catch (error) {
            errors.push(`run ${run}: ${error.message.split("\n")[0]}`);
          } finally {
            await context.close();
          }
        }
        const label = `${engineName} ${version} ${variant} ${id}`;
        report.results.push({ engine: engineName, version, variant, id, runs, passed, errors });
        console.info(`  ${passed === runs ? "ok  " : "FAIL"} ${label}: ${passed}/${runs}`);
        for (const error of errors) {
          console.error(`    ✗ ${error}`);
          failures.push(`${label} ${error}`);
        }
      }
      await server.close();
    }
    await browser.close();
  }
  const reportPath = argValues("--report")[0];
  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  const total = report.results.reduce((sum, r) => sum + r.runs, 0);
  if (failures.length) {
    for (const failure of failures)
      if (process.env.GITHUB_ACTIONS === "true")
        console.log(`::error title=stress:overlays::${failure}`);
    console.error(`stress:overlays failed: ${failures.length} of ${total} repetitions.`);
    process.exitCode = 1;
  } else
    console.info(`stress:overlays passed: ${total}/${total} repetitions (${process.platform}).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
