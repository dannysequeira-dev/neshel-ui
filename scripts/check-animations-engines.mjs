// pnpm check:animations:engines [--dist <dir>] [--engine chromium|firefox|webkit]... [--report <file>]
// Phase 009 (spec FR-061): the animations lab in Chromium, Firefox and WebKit through Playwright
// (the ADR 0016 harness; WebKit is Playwright's build, not Safari). Real mouse input for Tilt3D,
// keyboard focus, live reduced-motion emulation, the in-page engine suite shared with the CDP
// check, and the ScrollScene progress. Requires `pnpm build:playground`.
// Without Playwright or a browser: fails when CI=true, otherwise prints SKIPPED for that engine.
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { repoRoot } from "./lib/workspace.mjs";

const ENGINES = ["chromium", "firefox", "webkit"];

function argValues(name) {
  return process.argv.flatMap((arg, index) => (arg === name ? [process.argv[index + 1]] : []));
}

async function runEngine(playwright, engine, url) {
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
    await page.waitForFunction(() => window.__neshelLab?.engine !== undefined);

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
    const tilt = (selector) =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel);
        const angle = (axis) =>
          Number(
            new RegExp(`rotate${axis}\\((-?[\\d.]+)deg\\)`).exec(el.style.transform)?.[1] ?? 0,
          );
        return {
          state: el.getAttribute("data-neshel-tilt"),
          inline: el.style.transform,
          rx: angle("X"),
          ry: angle("Y"),
        };
      }, selector);

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
        await page.waitForTimeout(800);
        const tilted = await tilt("#tilt-basic");
        check(tilted.state === "pointer" && tilted.rx > 8 && tilted.ry > 8, JSON.stringify(tilted));
        await page.mouse.move(2, 2);
        await page.waitForTimeout(1600);
        const rest = await tilt("#tilt-basic");
        check(rest.state === "rest" && rest.inline === "", JSON.stringify(rest));
      },
    );

    await run("keyboard: keyboard focus inside the card shows the focus pose", async () => {
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press("Shift"); // keyboard modality for :focus-visible heuristics
      await page.focus("#tilt-focus-target");
      await page.waitForTimeout(800);
      const focused = await tilt("#tilt-basic");
      check(
        focused.state === "focus" && focused.rx > 3 && focused.ry < -3,
        JSON.stringify(focused),
      );
      await page.evaluate(() => document.activeElement?.blur());
      await page.waitForTimeout(1200);
    });

    await run("reduced motion (live): flat card, controllers complete immediately", async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(100);
      check((await tilt("#tilt-basic")).state === "reduced", "tilt not reduced");
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
      await page.waitForTimeout(100);
    });

    const suite = await page.evaluate(async () => {
      document.getElementById("engine-title").scrollIntoView();
      return window.__neshelLab.engine.runEngineSuite();
    });
    for (const item of suite) cases.push(item);

    await run("scene: progress follows scroll with the stage pinned", async () => {
      const g = await page.evaluate(() => {
        const s = document.getElementById("scene");
        const r = s.getBoundingClientRect();
        return { top: r.top + window.scrollY, distance: s.offsetHeight - window.innerHeight };
      });
      await page.evaluate((y) => window.scrollTo(0, y), g.top + g.distance * 0.25);
      await page.waitForTimeout(300);
      const state = await page.evaluate(() => ({
        progress: window.__neshelLab.sceneProgress,
        top: document.getElementById("scene-stage").getBoundingClientRect().top,
      }));
      check(
        Math.abs(state.progress - 0.25) < 0.02 && Math.abs(state.top) < 1,
        JSON.stringify(state),
      );
    });

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
      result = await runEngine(playwright, engine, url);
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
