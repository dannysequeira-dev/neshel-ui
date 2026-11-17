// pnpm check:animations:engines [--dist <dir>] [--engine chromium|firefox|webkit]... [--report <file>]
//   [--cpu-throttle <rate>]
// Phase 009 (spec FR-061): the animations lab in Chromium, Firefox and WebKit through Playwright
// (the ADR 0016 harness; WebKit is Playwright's build, not Safari). Real mouse input for Tilt3D,
// keyboard focus, live reduced-motion emulation, the in-page engine suite shared with the CDP
// check, the ScrollScene progress and its geometry invalidation. Results are decided by observable
// conditions with a ceiling (scripts/lib/animations-lab.mjs), never by fixed sleeps.
// `--cpu-throttle <rate>` slows Chromium's main thread (CDP) to exercise slow-runner timing.
// Requires `pnpm build:playground`.
// Without Playwright or a browser: fails when CI=true, otherwise prints SKIPPED for that engine.
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize, resolve, sep } from "node:path";
import {
  assertUntil,
  effectsInputCases,
  fxStateExpression,
  pressLiveReducedDone,
  pressLiveReducedStart,
  pressLiveReducedState,
  runSceneShiftCase,
  sceneShiftCases,
  scrollSceneTo,
  tiltStateExpression,
  untilExpression,
} from "./lib/animations-lab.mjs";
import { repoRoot } from "./lib/workspace.mjs";

const ENGINES = ["chromium", "firefox", "webkit"];
const axePath = createRequire(import.meta.url).resolve("axe-core/axe.min.js");

function argValues(name) {
  return process.argv.flatMap((arg, index) => (arg === name ? [process.argv[index + 1]] : []));
}

async function runEngine(playwright, engine, url, throttle) {
  const browser = await playwright[engine].launch();
  const cases = [];
  const notes = { version: browser.version() };
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "no-preference",
      colorScheme: "light",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(url);
    const evaluate = (expression) => page.evaluate(expression);
    const until = async (label, condition, describe) =>
      assertUntil(await evaluate(untilExpression(condition, describe)), label);
    await until(
      "lab ready",
      `window.__neshelLab?.engine !== undefined && window.__neshelLab.sceneGeometry !== undefined`,
      "window.__neshelLab",
    );
    if (throttle && engine === "chromium") {
      const session = await context.newCDPSession(page);
      await session.send("Emulation.setCPUThrottlingRate", { rate: throttle });
      notes.cpuThrottle = throttle;
    }

    const run = async (id, fn) => {
      try {
        await fn();
        cases.push({ id, ok: true });
      } catch (error) {
        cases.push({ id, ok: false, error: String(error?.message ?? error).split("\n")[0] });
      }
    };
    const check = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const tilt = (selector) => evaluate(tiltStateExpression(selector));
    const untilTilt = (label, selector, condition) =>
      until(
        label,
        `((t) => ${condition})(${tiltStateExpression(selector)})`,
        tiltStateExpression(selector),
      );

    await run("load: no errors; tilt at rest", async () => {
      check(errors.length === 0, errors.join(" | "));
      check((await tilt("#tilt-basic")).state === "rest", "not at rest");
    });

    await run(
      "tilt: real mouse to the top-right corner recedes it; leaving springs back",
      async () => {
        await page.locator("#tilt-basic").scrollIntoViewIfNeeded();
        const box = await page.locator("#tilt-basic").boundingBox();
        await page.mouse.move(2, 2);
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
        await page.mouse.move(box.x + box.width * 0.99, box.y + box.height * 0.01, { steps: 12 });
        await untilTilt(
          "pointer pose",
          "#tilt-basic",
          `t.state === "pointer" && t.rx > 8 && t.ry > 8`,
        );
        await page.mouse.move(2, 2);
        await untilTilt("back at rest", "#tilt-basic", `t.state === "rest" && t.inline === ""`);
      },
    );

    await run("keyboard: keyboard focus inside the card shows the focus pose", async () => {
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press("Shift"); // keyboard modality for :focus-visible heuristics
      await page.focus("#tilt-focus-target");
      await untilTilt("focus pose", "#tilt-basic", `t.state === "focus" && t.rx > 3 && t.ry < -3`);
      await page.evaluate(() => document.activeElement?.blur());
      await untilTilt("rest after blur", "#tilt-basic", `t.state === "rest" && t.inline === ""`);
    });

    await run("reduced motion (live): flat card, controllers complete immediately", async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await untilTilt("tilt reduced", "#tilt-basic", `t.state === "reduced" && t.inline === ""`);
      const result = await page.evaluate(async () => {
        const started = performance.now();
        const outcome = await window.__neshelLab.engine.api.animate(80, 5000).finished;
        window.__neshelLab.engine.api.animate(0, 0);
        window.__neshelLab.engine.api.unbind();
        return { ...outcome, ms: performance.now() - started };
      });
      check(
        result.status === "completed" && result.value === 80 && result.ms < 500,
        JSON.stringify(result),
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await untilTilt("left the reduced state", "#tilt-basic", `t.state === "rest"`);
    });

    const suite = await page.evaluate(async () => {
      document.getElementById("engine-title").scrollIntoView();
      return window.__neshelLab.engine.runEngineSuite();
    });
    for (const item of suite) cases.push(item);

    // Phase 010 effects gallery: in-page rendering suite, then real mouse/keyboard input.
    const effectSuite = await page.evaluate(async () => {
      document.getElementById("effects-title").scrollIntoView();
      return window.__neshelLab.effects.runEffectsSuite();
    });
    for (const item of effectSuite) cases.push(item);
    for (const item of effectsInputCases) {
      await run(item.id, async () => {
        const locator = page.locator(item.target);
        await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        const state = fxStateExpression(item.target);
        const key = (name) => (name === " " ? "Space" : name);
        for (const [index, step] of item.steps.entries()) {
          if (step.action === "hover") {
            await page.mouse.move(box.x + box.width * step.at[0], box.y + box.height * step.at[1], {
              steps: 4,
            });
          } else if (step.action === "leave") await page.mouse.move(2, 2, { steps: 4 });
          else if (step.action === "down") await page.mouse.down();
          else if (step.action === "up") await page.mouse.up();
          else if (step.action === "focus") await locator.focus();
          else if (step.action === "blur") await locator.evaluate((element) => element.blur());
          else if (step.action === "keydown") await page.keyboard.down(key(step.key));
          else if (step.action === "keyup") await page.keyboard.up(key(step.key));
          if (step.until) {
            await until(`${item.target} step ${index}`, `((s) => ${step.until})(${state})`, state);
          }
        }
      });
    }

    await run(
      "effects: reduced motion switched on mid-animation — toggle and number tick jump to the end",
      async () => {
        await evaluate(pressLiveReducedStart);
        await page.emulateMedia({ reducedMotion: "reduce" });
        // A 600 ms count and a spring travel cannot finish by themselves within the ceiling below.
        assertUntil(
          await evaluate(untilExpression(pressLiveReducedDone, pressLiveReducedState, 300)),
          "final state right after the preference changed",
          300,
        );
        await page.emulateMedia({ reducedMotion: "no-preference" });
      },
    );

    await run(
      "effects: reduced motion (emulated, live) — the lift renders its shadow without moving",
      async () => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        const state = fxStateExpression("#hover-lift");
        const locator = page.locator("#hover-lift");
        await locator.scrollIntoViewIfNeeded();
        const box = await locator.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 3 });
        await until(
          "shadow without movement",
          `((s) => s.lift === "1" && s.inline === "" && s.reducedQuery)(${state})`,
          state,
        );
        await page.mouse.move(2, 2);
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await until("rest", `((s) => s.lift === "" && !s.reducedQuery)(${state})`, state);
      },
    );

    await run("effects: axe finds no violations in the gallery", async () => {
      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => {
        const scope = document.getElementById("effects-title").parentElement;
        const result = await window.axe.run(scope, { resultTypes: ["violations"] });
        return result.violations.map(
          (v) =>
            `${v.id} (${v.impact}): ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(" "))
              .join(", ")}`,
        );
      });
      check(violations.length === 0, violations.join(" | "));
    });

    await run("scene: progress follows scroll with the stage pinned", async () => {
      await scrollSceneTo(evaluate, 0.25);
    });

    for (const item of sceneShiftCases) {
      await run(item.id, () => runSceneShiftCase(evaluate, item));
    }

    await run("no page errors during the run", async () =>
      check(errors.length === 0, errors.join(" | ")),
    );

    Object.assign(
      notes,
      await page.evaluate(() => ({
        webgl: window.__neshelLab.webgl,
        scrollDrivenAnimations: CSS.supports("animation-timeline: view()"),
        viewTransitions: typeof document.startViewTransition === "function",
        linearEasing: CSS.supports("transition-timing-function", "linear(0, 1)"),
        individualTransforms: CSS.supports("translate", "1px"),
        startingStyle: CSS.supports("transition-behavior", "allow-discrete"),
        effects: window.__neshelLab.notes,
      })),
    );
  } finally {
    await browser.close();
  }
  return { cases, notes };
}

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

/** Static server for the built lab: Chromium and WebKit refuse module scripts from file:// URLs. */
function serve(dir) {
  const server = createServer((request, response) => {
    const path = normalize(
      join(dir, decodeURIComponent(new URL(request.url, "http://x").pathname)),
    );
    if (!path.startsWith(dir + sep) || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    createReadStream(path).pipe(response);
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

async function main() {
  const dist = resolve(argValues("--dist")[0] ?? join(repoRoot, "apps", "playground-vite", "dist"));
  const page = join(dist, "animations.html");
  if (!existsSync(page)) throw new Error(`${page} not found; run pnpm build:playground first`);
  const selected = argValues("--engine");
  const engines = selected.length ? selected : ENGINES;
  const throttle = Number(argValues("--cpu-throttle")[0] ?? 0);
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    if (process.env.CI === "true") throw new Error("playwright is not installed");
    console.info("check:animations:engines SKIPPED (playwright not installed)");
    return;
  }
  const server = await serve(dist);
  const url = `http://127.0.0.1:${server.address().port}/animations.html`;
  const report = {};
  let failures = 0;
  for (const engine of engines) {
    let result;
    try {
      result = await runEngine(playwright, engine, url, throttle);
    } catch (error) {
      const message = `${engine}: cannot run (${String(error.message).split("\n")[0]}) — pnpm exec playwright install ${engine}`;
      if (process.env.CI === "true") throw new Error(message);
      console.info(`SKIPPED ${message}`);
      continue;
    }
    report[engine] = result;
    const failed = result.cases.filter((item) => !item.ok);
    failures += failed.length;
    console.info(
      `\n${engine} ${result.notes.version}${engine === "webkit" ? " (Playwright WebKit, not Safari)" : ""}`,
    );
    for (const item of result.cases)
      console.info(
        `${item.ok ? "ok  " : "FAIL"} ${item.id}${item.ok ? "" : `\n     ${item.error}`}`,
      );
    console.info(`notes: ${JSON.stringify(result.notes)}`);
  }
  server.close();
  const reportPath = argValues("--report")[0];
  if (reportPath) {
    mkdirSync(resolve(reportPath, ".."), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (failures) {
    console.error(`check:animations:engines failed: ${failures} case(s).`);
    process.exitCode = 1;
  } else {
    console.info(`\ncheck:animations:engines passed in ${Object.keys(report).join(", ")}.`);
  }
}

main().catch((error) => {
  console.error(`check:animations:engines could not complete: ${error.message}`);
  process.exitCode = 1;
});
