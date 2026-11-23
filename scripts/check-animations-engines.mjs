// pnpm check:animations:engines [--dist <dir>] [--engine chromium|firefox|webkit]... [--report <file>]
//   [--cpu-throttle <rate>]
// Phase 009 (spec FR-061): the animations lab in Chromium, Firefox and WebKit through Playwright
// (the ADR 0016 harness; WebKit is Playwright's build, not Safari). Real mouse input for Tilt3D,
// keyboard focus, live reduced-motion emulation, the in-page engine suite shared with the CDP
// check, the ScrollScene progress and its geometry invalidation, the Phase 011/012 gallery suites and an
// emulated touch device (phone viewport, hasTouch, real taps) for Phase 012. Results are decided by observable
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
  // Phase 016 GPU rows: Firefox on GPU-less Linux runners disables WebGL unless forced (software rendering).
  const browser = await playwright[engine].launch(
    engine === "firefox" ? { firefoxUserPrefs: { "webgl.force-enabled": true } } : {},
  );
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
      if (process.env.NESHEL_TRACE) console.info(`trace ${engine}: ${id}`);
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

    // Phase 011 scroll gallery (same in-page suite as the Chrome check).
    const scrollSuite = await page.evaluate(async () => {
      document.getElementById("scroll-title").scrollIntoView();
      return window.__neshelLab.scroll.runScrollSuite();
    });
    for (const item of scrollSuite) cases.push(item);
    await run(
      "scroll: reduced motion switched on live — horizontal sections (auto and pinned) stack, decorative layers stop",
      async () => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await until(
          "static alternatives",
          `(() => { const f = window.__neshelLab.scroll.reducedFacts(); return f.reduced && f.hscroll === "stacked" && f.hscrollPinned === "stacked" && f.pinnedTrackTransform === "" && f.dot === "" && f.scene === "" && f.skew === ""; })()`,
          "window.__neshelLab.scroll.reducedFacts()",
        );
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await until(
          "pinned again",
          `(() => { const f = window.__neshelLab.scroll.reducedFacts(); return f.hscroll === "pinned" && f.hscrollPinned === "pinned"; })()`,
          "window.__neshelLab.scroll.reducedFacts()",
        );
      },
    );

    // Phase 012 gestures/layout gallery (same in-page suite as the Chrome check; synthetic multi-pointer
    // input with pointer ids, so pinch/rotate run in every engine).
    // The real mouse away from the gallery: WebKit dispatches pointer events when content scrolls under a
    // stationary cursor, which would mix with the suite's synthetic input.
    await page.mouse.move(1, 1);
    if (process.env.NESHEL_TRACE) console.info(`trace ${engine}: gestures suite`);
    const gestureSuite = await page.evaluate(async () => {
      document.getElementById("gestures-title").scrollIntoView();
      return window.__neshelLab.gestures.runGesturesSuite();
    });
    for (const item of gestureSuite) cases.push(item);
    await run(
      "phase 012: reduced motion switched on live — FLIP applies at once, no inertia, follower hidden",
      async () => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        const facts = await page.evaluate(() => window.__neshelLab.gestures.reducedFacts());
        await page.emulateMedia({ reducedMotion: "no-preference" });
        check(
          facts.reduced === true &&
            facts.flipTransform === "" &&
            facts.follower === "" &&
            facts.dragIdle,
          JSON.stringify(facts),
        );
      },
    );
    notes.l06Driver = await page.evaluate(() => window.__neshelLab.notes.l06Driver);
    await run(
      "H11 real mouse: the follower appears under the real pointer and hides on leave",
      async () => {
        const area = page.locator("#h11-area");
        await area.scrollIntoViewIfNeeded();
        const box = await area.boundingBox();
        await page.mouse.move(box.x + 30, box.y + 30);
        await page.mouse.move(box.x + box.width / 2, box.y + 40, { steps: 6 });
        await until(
          "visible",
          `Number(getComputedStyle(document.querySelector("#h11-area .neshel-cursor-follower")).opacity) > 0.9`,
          `document.querySelector("#h11-area .neshel-cursor-follower").style.cssText`,
        );
        await page.mouse.move(1, 1, { steps: 4 });
        await until(
          "hidden",
          `document.querySelector("#h11-area .neshel-cursor-follower").style.opacity === ""`,
          `document.querySelector("#h11-area .neshel-cursor-follower").style.cssText`,
        );
      },
    );

    // Phase 013 cinematic & page-transitions gallery: the same in-page suites as the Chrome check (native View
    // Transition facts are observed per engine), the live reduced-motion facts and a REAL cross-document
    // navigation between the two MPA pages (native in Chromium/WebKit; plain navigation in Firefox).
    await page.mouse.move(1, 1);
    if (process.env.NESHEL_TRACE) console.info(`trace ${engine}: cinematic suite`);
    const cinematicSuite = await page.evaluate(() =>
      window.__neshelLab.cinematic.runCinematicSuite(),
    );
    for (const item of cinematicSuite) cases.push(item);
    if (process.env.NESHEL_TRACE) console.info(`trace ${engine}: page suite`);
    const pageSuite = await page.evaluate(() => window.__neshelLab.cinematic.runPageSuite());
    for (const item of pageSuite) cases.push(item);
    await run(
      "phase 013: reduced motion live — instant page effects start no transition; no blur; no autoplay",
      async () => {
        // A fresh page, independent of the page-transition suite above: Playwright WebKit 27.2 crashed
        // (renderer "Target crashed") in 1 of 6 local runs when the media emulation was switched right after
        // that suite (evidence.md §4, known issue K-3); the reduced behaviour itself is engine-independent.
        const fresh = await context.newPage();
        await fresh.goto(url);
        await fresh.waitForFunction(() => window.__neshelLab?.cinematic !== undefined);
        await fresh.emulateMedia({ reducedMotion: "reduce" });
        const facts = await fresh.evaluate(() => window.__neshelLab.cinematic.reducedFacts());
        await fresh.close();
        check(
          facts.reduced === true &&
            facts.wipeStartedTransitions === 0 &&
            facts.depthBlur === "" &&
            String(facts.storyboardRotation).startsWith("Start"),
          JSON.stringify(facts),
        );
      },
    );
    // Phase 014 text & SVG gallery: the same in-page suite as the Chrome check; reduced motion on a fresh page.
    if (process.env.NESHEL_TRACE) console.info(`trace ${engine}: text/svg suite`);
    const textSvgSuite = await page.evaluate(() => window.__neshelLab.textSvg.runTextSvgSuite());
    for (const item of textSvgSuite) cases.push(item);
    await run(
      "phase 014: reduced motion live — reveals instant, wave off, ants static, no turbulence filter",
      async () => {
        const fresh = await context.newPage();
        await fresh.goto(url);
        await fresh.waitForFunction(() => window.__neshelLab?.textSvg !== undefined);
        await fresh.emulateMedia({ reducedMotion: "reduce" });
        const facts = await fresh.evaluate(() => window.__neshelLab.textSvg.reducedFacts());
        await fresh.close();
        check(
          facts.reduced === true &&
            facts.waveTransform === false &&
            facts.filters === 0 &&
            ["0", "0px", ""].includes(facts.antsOffset),
          JSON.stringify(facts),
        );
      },
    );
    notes.textSvg = await page.evaluate(() => {
      const n = window.__neshelLab.notes;
      return {
        textSupport: n.textSupport,
        svgSupport: n.svgSupport,
        s03Mode: n.s03Mode,
        capsize: n.capsizeHeights,
        t10: n.t10Widths,
        performance: n.performance,
      };
    });
    // Phase 015 media/ambient/feedback gallery: the same in-page suite as the Chrome check; reduced motion on a fresh
    // page.
    if (process.env.NESHEL_TRACE) console.info(`trace ${engine}: media suite`);
    const mediaSuite = await page.evaluate(() => window.__neshelLab.media.runMediaSuite());
    for (const item of mediaSuite) cases.push(item);
    // PR #16 review R2: destroy in the middle of a real mouse drag must release the pointer capture.
    await run(
      "M04 real mouse: destroy mid-drag releases the capture; the next control receives input",
      async () => {
        const probe = () => page.evaluate(() => window.__neshelLab.media.compareProbe.state());
        await page.evaluate(() => {
          document.getElementById("m04-probe").scrollIntoView({ block: "center" });
          window.__neshelLab.media.compareProbe.create();
        });
        const box = await page.locator("#m04-probe").boundingBox();
        const y = box.y + box.height / 2;
        await page.mouse.move(box.x + box.width * 0.7, y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.6, y);
        const during = await probe();
        check(during.captured === true, `capture during drag: ${JSON.stringify(during)}`);
        await page.evaluate(() => {
          window.__neshelLab.media.compareProbe.destroy();
          window.__neshelLab.media.compareProbe.clearLog();
        });
        const after = await probe();
        check(after.captured === false, `capture after destroy: ${JSON.stringify(after)}`);
        const next = await page.locator("#m04-probe-next").boundingBox();
        await page.mouse.move(next.x + next.width / 2, next.y + next.height / 2);
        const held = await probe();
        check(
          held.log.includes("next:pointermove") && !held.log.includes("root:pointermove"),
          `moves while held: ${JSON.stringify(held.log)}`,
        );
        await page.mouse.up();
        await page.evaluate(() => window.__neshelLab.media.compareProbe.clearLog());
        await page.mouse.click(next.x + next.width / 2, next.y + next.height / 2);
        const clicked = await probe();
        check(clicked.log.includes("next:click"), `next control: ${JSON.stringify(clicked.log)}`);
        await page.mouse.move(2, 2);
      },
    );
    await run(
      "phase 015: reduced motion live — ambient static, no canvas task, slow spinner pulse, no camera",
      async () => {
        const fresh = await context.newPage();
        await fresh.goto(url);
        await fresh.waitForFunction(() => window.__neshelLab?.media?.reducedFacts !== undefined);
        await fresh.emulateMedia({ reducedMotion: "reduce" });
        const facts = await fresh.evaluate(() => window.__neshelLab.media.reducedFacts());
        await fresh.close();
        check(
          facts.reduced === true &&
            facts.ambientAnimation === "none" &&
            facts.canvasTasks === 0 &&
            facts.spinnerAnimation === "neshel-fb-slow-pulse" &&
            facts.kenBurnsScale === "",
          JSON.stringify(facts),
        );
      },
    );
    notes.media = await page.evaluate(() => {
      const n = window.__neshelLab.notes;
      return { support: n.mediaSupport, m05: n.m05Filter, m06: n.m06, m09: n.m09, f10: n.f10Clip };
    });
    // Phase 016 advanced 3D/GPU gallery: the same in-page suite as the Chrome check (WebGL2 pixel probes, forced
    // context loss, separate fallback rows), real mouse input for CornerRecede, real keyboard for the flip and the
    // ring, reduced motion on a fresh page.
    if (process.env.NESHEL_TRACE) console.info(`trace ${engine}: advanced suite`);
    const advancedSuite = await page.evaluate(() => window.__neshelLab.advanced.runAdvancedSuite());
    // GPU rows need WebGL2. Playwright Firefox on GPU-less Linux runners has none (software GL is not picked up in
    // headless mode); only there a NO_WEBGL2 row is reported as SKIPPED (never as a pass) and recorded. Everywhere
    // else (Chromium, WebKit, Firefox on Windows/macOS) a missing WebGL2 fails the row.
    const skippable = engine === "firefox" && process.platform === "linux";
    notes.gpuSkipped = [];
    for (const item of advancedSuite) {
      if (!item.ok && skippable && String(item.error).startsWith("NO_WEBGL2")) {
        notes.gpuSkipped.push(item.id);
        cases.push({
          id: `SKIPPED (no WebGL2 on this runner) — ${item.id}`,
          ok: true,
          skipped: true,
        });
      } else cases.push(item);
    }
    await run(
      "D05 real mouse: the corner under the pointer recedes, switches corners through flat, returns on leave",
      async () => {
        const corner = () =>
          page.evaluate(() => {
            const c = window.__neshelLab.advanced.controls.corner.current;
            return {
              corner: c.corner,
              amount: c.amount,
              flap: !!document.querySelector("#d05-root .neshel-corner-flap"),
            };
          });
        await page.evaluate(() =>
          document.getElementById("d05-root").scrollIntoView({ block: "center" }),
        );
        const box = await page.locator("#d05-root").boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.move(box.x + box.width - 5, box.y + 5, { steps: 4 });
        await page.waitForFunction(() => {
          const c = window.__neshelLab.advanced.controls.corner.current;
          return c.corner === "top-right" && c.amount > 0.8;
        });
        check((await corner()).flap, "flap rendered");
        await page.mouse.move(box.x + 5, box.y + box.height - 5, { steps: 6 });
        await page.waitForFunction(() => {
          const c = window.__neshelLab.advanced.controls.corner.current;
          return c.corner === "bottom-left" && c.amount > 0.8;
        });
        await page.mouse.move(2, 2);
        await page.waitForFunction(
          () =>
            window.__neshelLab.advanced.controls.corner.current.amount < 0.001 &&
            !document.querySelector("#d05-root .neshel-corner-flap"),
        );
      },
    );
    await run(
      "D01 real keyboard: Enter on the in-face toggle flips; focus lands on the visible face",
      async () => {
        await page.evaluate(() => {
          const b = document.getElementById("d01-front-toggle");
          b.scrollIntoView({ block: "center" });
          b.focus();
        });
        await page.keyboard.press("Enter");
        const flipState = () =>
          page.evaluate(() => ({
            side: window.__neshelLab.advanced.controls.flip.current.side,
            progress: window.__neshelLab.advanced.controls.flip.current.progress,
            active: document.activeElement?.id || document.activeElement?.tagName,
          }));
        await page
          .waitForFunction(
            () =>
              window.__neshelLab.advanced.controls.flip.current.side === "back" &&
              document.activeElement?.id === "d01-back-link",
            null,
            { timeout: 8000 },
          )
          .catch(async () => {
            throw new Error(`not flipped by Enter: ${JSON.stringify(await flipState())}`);
          });
        await page.evaluate(() => document.getElementById("d01-back-toggle").focus());
        const focused = await flipState();
        await page.keyboard.press("Enter");
        await page
          .waitForFunction(
            () => window.__neshelLab.advanced.controls.flip.current.side === "front",
            null,
            { timeout: 8000 },
          )
          .catch(async () => {
            throw new Error(
              `not flipped back by Enter: before ${JSON.stringify(focused)}, after ${JSON.stringify(await flipState())}`,
            );
          });
      },
    );
    await run("D03 real keyboard: arrows on the focused ring move the front item", async () => {
      await page.evaluate(() => {
        const r = document.getElementById("d03-ring");
        r.scrollIntoView({ block: "center" });
        r.focus();
      });
      await page.keyboard.press("ArrowLeft");
      await page.waitForFunction(
        () => window.__neshelLab.advanced.controls.ring.current.index === 5,
      );
      await page.keyboard.press("Home");
      await page.waitForFunction(
        () => window.__neshelLab.advanced.controls.ring.current.index === 0,
      );
    });
    await run(
      "phase 016: reduced motion live — fade flip, no glitch, static floor, no GPU distortion",
      async () => {
        const fresh = await context.newPage();
        await fresh.goto(url);
        await fresh.waitForFunction(() => window.__neshelLab?.advanced?.reducedFacts !== undefined);
        await fresh.emulateMedia({ reducedMotion: "reduce" });
        const facts = await fresh.evaluate(() => window.__neshelLab.advanced.reducedFacts());
        await fresh.close();
        check(
          facts.flipMode === "fade" &&
            facts.glitchActive === false &&
            facts.gridState === "reduced" &&
            facts.floorRunning === false &&
            facts.rippleActive === false &&
            facts.rippleMode === "static" &&
            facts.depthMode === "static",
          JSON.stringify(facts),
        );
      },
    );
    notes.advanced = await page.evaluate(() => ({
      debug: window.__neshelLab.advanced.debug(),
      d11: window.__neshelLab.notes.d11Mode,
      d04: window.__neshelLab.notes.d04,
    }));
    notes.viewTransitionSupport = await page.evaluate(
      () => window.__neshelLab.notes.viewTransitions,
    );
    notes.timelineStress = await page.evaluate(() => window.__neshelLab.notes.timelineStress);
    await run(
      "PT09 cross-document navigation (MPA): native where supported, plain navigation otherwise",
      async () => {
        const mpa = await context.newPage();
        try {
          await mpa.goto(url.replace("animations.html", "mpa-a.html"));
          await mpa.evaluate(() => sessionStorage.removeItem("neshel-mpa-log"));
          await mpa.click("#mpa-next");
          await mpa.waitForURL(/mpa-b\.html/);
          await mpa.waitForFunction(() =>
            JSON.parse(sessionStorage.getItem("neshel-mpa-log") || "[]").some(
              (entry) => entry.page === "b" && entry.event === "load",
            ),
          );
          const log = await mpa.evaluate(() =>
            JSON.parse(sessionStorage.getItem("neshel-mpa-log") || "[]"),
          );
          const supported = await mpa.evaluate(() => "onpagereveal" in window);
          const swap = log.find((entry) => entry.page === "a" && entry.event === "pageswap");
          const reveal = log.find((entry) => entry.page === "b" && entry.event === "pagereveal");
          // Deterministic facts: the navigation completes; where supported, the opt-in starts a
          // cross-document transition on the outgoing page. Whether the incoming page revealed it is
          // recorded, not asserted: Playwright Chromium 158 skipped the reveal in part of the runs when the
          // pages load module scripts (evidence.md §5, known issue K-2); WebKit revealed it every time.
          notes.mpa = { supported, revealed: reveal?.vt === true, log };
          check(
            (await mpa.textContent("#mpa-title")) === "Chapter two",
            "the navigation completed",
          );
          if (supported) {
            check(swap?.vt === true, `cross-document transition started: ${JSON.stringify(log)}`);
          } else {
            check(
              !reveal && !swap,
              `fallback: plain navigation without pageswap/pagereveal (${JSON.stringify(log)})`,
            );
          }
        } finally {
          await mpa.close();
        }
      },
    );

    // Emulated touch device: a phone viewport with touch input (`hasTouch`; `isMobile` where supported).
    // Real taps go through the engine's touch pipeline; the in-page suite runs again in the narrow layout.
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: engine !== "firefox",
      reducedMotion: "no-preference",
      colorScheme: "light",
    });
    try {
      const mobile = await phone.newPage();
      const mobileErrors = [];
      mobile.on("pageerror", (error) => mobileErrors.push(error.message));
      await mobile.goto(url);
      await mobile.waitForFunction(() => window.__neshelLab?.gestures !== undefined);
      notes.touchDevice = await mobile.evaluate(() => ({
        touchEvents: "TouchEvent" in window,
        coarse: matchMedia("(pointer: coarse)").matches,
        maxTouchPoints: navigator.maxTouchPoints,
      }));
      const tapCenter = async (selector) => {
        const target = mobile.locator(selector).first();
        await target.scrollIntoViewIfNeeded();
        const box = await target.boundingBox();
        await mobile.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      };
      await run(
        "touch device: a real tap on the dismiss button removes a note (G03 alternative)",
        async () => {
          const count = () =>
            mobile.evaluate(() => document.querySelectorAll("#g03-list .g-note").length);
          const before = await count();
          await tapCenter("#g03-list .g-note .neshel-swipe-dismiss");
          await mobile.waitForFunction(
            (n) => document.querySelectorAll("#g03-list .g-note").length === n - 1,
            before,
          );
          await tapCenter("#g03-reset");
          await mobile.waitForFunction(
            () => document.querySelectorAll("#g03-list .g-note").length === 3,
          );
        },
      );
      await run(
        "touch device: real taps on the zoom buttons zoom and reset (G08 alternative)",
        async () => {
          const scale = () =>
            mobile.evaluate(() => {
              const m = new DOMMatrix(
                getComputedStyle(document.querySelector("#g08-zoom img")).transform,
              );
              return Math.hypot(m.a, m.b);
            });
          await tapCenter('#g08-zoom button:has-text("Zoom in")');
          await mobile.waitForFunction(() => {
            const m = new DOMMatrix(
              getComputedStyle(document.querySelector("#g08-zoom img")).transform,
            );
            return Math.abs(Math.hypot(m.a, m.b) - 1.5) < 0.01;
          });
          await tapCenter('#g08-zoom button:has-text("Reset zoom")');
          await mobile.waitForFunction(() => {
            const m = new DOMMatrix(
              getComputedStyle(document.querySelector("#g08-zoom img")).transform,
            );
            return Math.abs(Math.hypot(m.a, m.b) - 1) < 0.01;
          });
          check((await scale()) < 1.01, "reset");
        },
      );
      await run(
        "touch device: a real tap toggles presence (L08) and the accordion (L06)",
        async () => {
          await tapCenter("#l08-toggle");
          await mobile.waitForFunction(() => !document.getElementById("l08-card"));
          await tapCenter("#l08-toggle");
          await mobile.waitForFunction(() => !!document.getElementById("l08-card"));
          await tapCenter("#l06-trigger-1");
          await mobile.waitForFunction(
            () =>
              document.getElementById("l06-panel-1").getAttribute("data-state") === "open" &&
              document.getElementById("l06-panel-1").getBoundingClientRect().height > 10,
          );
          await tapCenter("#l06-trigger-1");
          await mobile.waitForFunction(
            () => document.getElementById("l06-panel-1").getBoundingClientRect().height < 0.5,
          );
        },
      );
      const phoneSuite = await mobile.evaluate(async () => {
        document.getElementById("gestures-title").scrollIntoView();
        return window.__neshelLab.gestures.runGesturesSuite();
      });
      for (const item of phoneSuite)
        cases.push({ ...item, id: `touch device (390×844): ${item.id}` });
      await run(
        "touch device (390×844): C09 real taps on Next/Stop change frames; C10 tap toggles bars",
        async () => {
          await tapCenter("#c09 [aria-label='Next slide']");
          await mobile.waitForFunction(
            () =>
              [...document.querySelectorAll("#c09 .neshel-storyboard-frame")].findIndex((f) =>
                f.hasAttribute("data-current"),
              ) !== 0,
          );
          await tapCenter("#c09 [aria-label^='Stop']");
          await mobile.waitForFunction(() =>
            document.querySelector("#c09 .neshel-storyboard-frame")?.hasAttribute("data-current"),
          );
          await tapCenter("#c10-toggle");
          await mobile.waitForFunction(
            () => !document.querySelector("#c10 .neshel-letterbox-bars")?.hidden,
          );
          const wide = await mobile.evaluate(() => {
            // Phase 013 gallery only: no element of it reaches past the viewport unless clipped by a parent.
            const section = document.getElementById("cinematic-title")?.closest("section");
            const width = document.documentElement.clientWidth;
            const clipped = (el) => {
              for (let n = el.parentElement; n && n !== section; n = n.parentElement) {
                if (getComputedStyle(n).overflowX !== "visible") return true;
              }
              return false;
            };
            return [...(section?.querySelectorAll("*") ?? [])]
              .filter((el) => el.getBoundingClientRect().right > width + 1 && !clipped(el))
              .map((el) => el.id || el.className)
              .slice(0, 5);
          });
          check(
            wide.length === 0,
            `Phase 013 gallery overflows the phone viewport: ${wide.join(", ")}`,
          );
        },
      );
      await run("touch device: no page errors", async () =>
        check(mobileErrors.length === 0, mobileErrors.join(" | ")),
      );
    } finally {
      await phone.close();
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
  ".webm": "video/webm",
  ".mp4": "video/mp4",
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
    const type = TYPES[extname(path)] ?? "application/octet-stream";
    // Byte ranges (Phase 015 M06): media elements seek with Range requests.
    const size = statSync(path).size;
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? "");
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      response.writeHead(206, {
        "content-type": type,
        "accept-ranges": "bytes",
        "content-range": `bytes ${start}-${end}/${size}`,
        "content-length": end - start + 1,
      });
      createReadStream(path, { start, end }).pipe(response);
      return;
    }
    response.writeHead(200, {
      "content-type": type,
      "accept-ranges": "bytes",
      "content-length": size,
    });
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
