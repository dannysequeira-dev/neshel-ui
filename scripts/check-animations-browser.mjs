// pnpm check:browser:animations [--dist <dir>] [--report <file>] [--cpu-throttle <rate>]
// Feature 008.0 (spec FR-090–FR-099): real-input checks of the animations lab in headless Chrome
// through the DevTools protocol (scripts/lib/cdp.mjs): Tilt3D pointer, return, composition,
// keyboard focus, unmount, live reduced-motion changes, zero React commits during movement;
// CornerRecede techniques; ScrollScene pinning, progress, depth layers, timeline segments, resize
// re-measurement, geometry invalidation and smooth scrub; axe. Results are decided by observable
// conditions with a ceiling (scripts/lib/animations-lab.mjs), never by fixed sleeps; short frame
// counts only bound "nothing must happen" checks. `--cpu-throttle <rate>` slows the page's main
// thread to exercise slow-runner timing. Requires `pnpm build:playground` first.
// Without a browser: fails when CI=true, otherwise prints SKIPPED and exits 0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertUntil,
  effectsInputCases,
  framesExpression,
  fxStateExpression,
  pressLiveReducedDone,
  pressLiveReducedStart,
  pressLiveReducedState,
  runSceneShiftCase,
  sceneConsistentCondition,
  sceneScrollExpression,
  sceneShiftCases,
  sceneStateExpression,
  scrollSceneTo,
  tiltStateExpression,
  untilExpression,
} from "./lib/animations-lab.mjs";
import { findBrowser, launchBrowser } from "./lib/cdp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const wait = (ms) => `new Promise((resolve) => setTimeout(resolve, ${ms}))`;

async function main() {
  const dist = resolve(argValue("--dist", join(repoRoot, "apps", "playground-vite", "dist")));
  const page = join(dist, "animations.html");
  if (!existsSync(page)) throw new Error(`${page} not found; run pnpm build:playground first`);
  const executable = findBrowser();
  if (!executable) {
    if (process.env.CI === "true")
      throw new Error("no Chrome/Chromium/Edge found on this CI runner");
    console.info(
      "check:browser:animations SKIPPED (no Chrome, Chromium or Edge found; set NESHEL_CHROME)",
    );
    return;
  }
  const require = createRequire(import.meta.url);
  const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  const browser = await launchBrowser(executable);
  console.info(`Browser: ${browser.version}`);
  const cases = [];
  const notes = {};
  try {
    const p = await browser.newPage();
    await p.setViewport(1280, 900);
    // One call sets both features (each setEmulatedMedia call replaces the previous feature list).
    const motionPreference = (value) =>
      p.send("Emulation.setEmulatedMedia", {
        features: [
          { name: "prefers-color-scheme", value: "light" },
          { name: "prefers-reduced-motion", value },
        ],
      });
    // The host OS preference leaks into headless Chrome (GitHub's macOS images enable "Reduce
    // motion"), so record it and pin `no-preference`; the reduced cases emulate `reduce` explicitly.
    await p.goto("about:blank");
    notes.systemPrefersReducedMotion = await p.evaluate(
      `matchMedia("(prefers-reduced-motion: reduce)").matches`,
    );
    await motionPreference("no-preference");
    await p.goto(pathToFileURL(page).href);
    const evaluate = (expression) => p.evaluate(expression);
    const until = async (label, condition, describe) =>
      assertUntil(await evaluate(untilExpression(condition, describe)), label);
    await until(
      "lab ready",
      `window.__neshelLab?.engine !== undefined && window.__neshelLab.sceneGeometry !== undefined && document.getElementById("tilt-basic")?.getAttribute("data-neshel-tilt") === "rest"`,
      "window.__neshelLab",
    );
    const throttle = Number(argValue("--cpu-throttle", 0));
    if (throttle) {
      await p.send("Emulation.setCPUThrottlingRate", { rate: throttle });
      notes.cpuThrottle = throttle;
    }

    const run = async (id, fn) => {
      try {
        await fn();
        cases.push({ id, ok: true });
      } catch (error) {
        cases.push({ id, ok: false, error: error.message });
      }
    };
    const check = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const mouse = (x, y) => p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    const key = async (keyName, code, keyCode, modifiers = 0) => {
      for (const type of ["rawKeyDown", "keyUp"]) {
        await p.send("Input.dispatchKeyEvent", {
          type,
          key: keyName,
          code,
          windowsVirtualKeyCode: keyCode,
          modifiers,
        });
      }
    };
    const rectOf = (selector) =>
      p.evaluate(
        `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; })()`,
      );
    const tiltState = (selector) => evaluate(tiltStateExpression(selector));
    // Wait until the Tilt3D state of `selector` satisfies `condition` (an expression over `t`).
    const untilTilt = (label, selector, condition) =>
      until(
        label,
        `((t) => ${condition})(${tiltStateExpression(selector)})`,
        tiltStateExpression(selector),
      );
    const scrollIntoView = (selector) =>
      p.evaluate(
        `(() => { document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center" }); })()`,
      );

    await run("load: no errors, tilt cards at rest after hydration", async () => {
      check(p.errors.length === 0, `page errors: ${p.errors.join(" | ")}`);
      const tilt = await tiltState("#tilt-basic");
      check(tilt.state === "rest", `state ${tilt.state}`);
      check(tilt.inline === "", `inline transform ${tilt.inline}`);
    });

    await run("tilt: top-right pointer recedes that corner; zero React commits", async () => {
      await scrollIntoView("#tilt-basic");
      await mouse(5, 5);
      const r = await rectOf("#tilt-basic");
      const commits = await p.evaluate("window.__neshelLab.tiltCommits");
      for (let step = 0; step <= 10; step++) {
        await mouse(
          r.left + r.width * (0.5 + step * 0.0495),
          r.top + r.height * (0.5 - step * 0.0495),
        );
        await p.evaluate(wait(16)); // input pacing only
      }
      await untilTilt(
        "pointer pose",
        "#tilt-basic",
        `t.state === "pointer" && t.rx > 8 && t.ry > 8 && t.computed !== "none"`,
      );
      const after = await p.evaluate("window.__neshelLab.tiltCommits");
      check(
        after === commits,
        `React committed ${after - commits} time(s) during pointer movement`,
      );
    });

    await run("tilt: leaving springs back and removes the inline transform", async () => {
      await mouse(2, 2);
      // A spring return keeps an inline transform for several frames; a snap clears it at once.
      await p.evaluate(framesExpression(2));
      const mid = await tiltState("#tilt-basic");
      check(mid.inline !== "", "snapped instead of animating back");
      await untilTilt("back at rest", "#tilt-basic", `t.state === "rest" && t.inline === ""`);
    });

    await run("composition: CSS translate lift + JS transform tilt on one element", async () => {
      const r = await rectOf("#tilt-composed");
      await mouse(r.left + r.width * 0.9, r.top + r.height * 0.5);
      await mouse(r.left + r.width * 0.92, r.top + r.height * 0.5);
      await untilTilt(
        "tilt and CSS lift composed",
        "#tilt-composed",
        `/rotateY\\(/.test(t.inline) && /scale\\(1\\.03\\)/.test(t.inline) && t.translate === "0px -6px"`,
      );
      await mouse(2, 2);
      await untilTilt(
        "composed card at rest",
        "#tilt-composed",
        `t.state === "rest" && t.inline === ""`,
      );
    });

    await run(
      "keyboard: Tab focus shows the focus pose; moving focus on returns it to rest",
      async () => {
        await p.evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)");
        await key("Tab", "Tab", 9);
        const active = await p.evaluate("document.activeElement?.id");
        check(active === "tilt-focus-target", `active element ${active}`);
        await untilTilt(
          "focus pose",
          "#tilt-basic",
          `t.state === "focus" && t.rx > 3 && t.ry < -3`,
        );
        await key("Tab", "Tab", 9);
        await untilTilt("rest after Tab", "#tilt-basic", `t.state === "rest" && t.inline === ""`);
        await untilTilt("asChild link focused", "#tilt-depth", `t.state === "focus"`);
        await p.evaluate("document.activeElement?.blur()");
        await untilTilt(
          "link at rest after blur",
          "#tilt-depth",
          `t.state === "rest" && t.inline === ""`,
        );
      },
    );

    await run("unmount and remount: no errors, effect re-attached", async () => {
      await p.evaluate(`document.getElementById("tilt-toggle").click()`);
      await until(
        "card unmounted",
        `!document.getElementById("tilt-basic") && !!document.getElementById("tilt-unmounted")`,
        `document.getElementById("tilt-toggle").textContent`,
      );
      await p.evaluate(`document.getElementById("tilt-toggle").click()`);
      await untilTilt("card remounted at rest", "#tilt-basic", `t !== null && t.state === "rest"`);
      check(p.errors.length === 0, `page errors: ${p.errors.join(" | ")}`);
    });

    await run("reduced motion (live change): flat cards, no transform on hover", async () => {
      await motionPreference("reduce");
      await untilTilt("entered the reduced state", "#tilt-basic", `t.state === "reduced"`);
      await scrollIntoView("#tilt-basic");
      const r = await rectOf("#tilt-basic");
      await mouse(r.right - 4, r.top + 4);
      await mouse(r.right - 3, r.top + 5);
      // Nothing may move while reduced: no transform after several frames of hover.
      await p.evaluate(framesExpression(10));
      const tilt = await tiltState("#tilt-basic");
      check(tilt.inline === "" && tilt.computed === "none", `inline ${tilt.inline}`);
      await mouse(2, 2);
      await motionPreference("no-preference");
      // A fixed 100 ms wait failed on macOS (main runs 43810901141, 43813368226): wait until the
      // controller has left the reduced state; the diagnostics include the media query result.
      await untilTilt(
        "left the reduced state",
        "#tilt-basic",
        `t.state === "rest" && !t.reducedQuery`,
      );
    });

    await run("corner: spring-animated amount drives all four techniques", async () => {
      await scrollIntoView("#corner-grid, .corner-grid");
      notes.webgl = await p.evaluate("window.__neshelLab.webgl");
      // Sample the amount on every animation frame (independent of runner speed; a fixed 80 ms read
      // was flaky on a loaded macOS runner, run 43804188974): an animation shows intermediate values,
      // a jump does not.
      const samples = await p.evaluate(`new Promise((resolve) => {
        const values = [];
        const start = performance.now();
        document.getElementById("corner-toggle").click();
        const sample = () => {
          const amount = window.__neshelLab.cornerAmount;
          values.push(amount);
          if (Math.abs(amount - 1) < 0.001 || performance.now() - start > 5000) resolve(values);
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      })`);
      const intermediate = samples.filter((value) => value > 0.01 && value < 0.99).length;
      check(
        intermediate >= 3,
        `only ${intermediate} intermediate values in ${samples.length} frames`,
      );
      await until(
        "corner amount settled at 1",
        "Math.abs(window.__neshelLab.cornerAmount - 1) < 0.01",
        "window.__neshelLab.cornerAmount",
      );
      const state = await p.evaluate(`(() => ({
        amount: window.__neshelLab.cornerAmount,
        range: document.getElementById("corner-amount").value,
        rigid: getComputedStyle(document.getElementById("corner-rigid")).transform,
        flap: getComputedStyle(document.querySelector(".corner-fold-flap")).transform,
        flapHidden: document.querySelector(".corner-fold-flap").getAttribute("aria-hidden"),
        flapInert: document.querySelector(".corner-fold-flap").inert,
        tiles: document.querySelectorAll(".corner-tile").length,
        cornerTile: getComputedStyle(document.querySelectorAll(".corner-tile")[7]).transform,
        farTile: getComputedStyle(document.querySelectorAll(".corner-tile")[56]).transform,
      }))()`);
      check(Math.abs(state.amount - 1) < 0.01, `amount ${state.amount}`);
      check(state.range === "100", `range ${state.range}`);
      check(
        state.rigid !== "none" && state.flap !== "none",
        `rigid ${state.rigid} flap ${state.flap}`,
      );
      check(
        state.flapHidden === "true" && state.flapInert === true,
        "flap copy is not hidden/inert",
      );
      check(state.tiles === 64, `${state.tiles} tiles`);
      check(state.cornerTile.startsWith("matrix3d"), `corner tile ${state.cornerTile}`);
      check(
        state.farTile === "none" ||
          /matrix\(1, 0, 0, 1, 0, 0\)/.test(state.farTile) ||
          /, 0, 0, 0, 1\)$/.test(state.farTile),
        `far tile ${state.farTile}`,
      );
      check(["ready", "unavailable"].includes(notes.webgl), `webgl ${notes.webgl}`);
    });

    await run("corner: reduced motion jumps without animation", async () => {
      await motionPreference("reduce");
      await p.evaluate(`document.getElementById("corner-toggle").click()`);
      const amount = await p.evaluate("window.__neshelLab.cornerAmount");
      check(amount === 0, `amount right after the click: ${amount}`);
      await motionPreference("no-preference");
    });

    const sceneState = () => evaluate(sceneStateExpression);
    const scrollScene = (fraction) => scrollSceneTo(evaluate, fraction);

    await run(
      "scene: pinned stage, synchronised progress, depth ordering, timeline segment",
      async () => {
        await scrollScene(0.25);
        const quarter = await sceneState();
        check(Math.abs(quarter.progress - 0.25) < 0.02, `progress ${quarter.progress}`);
        check(Math.abs(quarter.css - quarter.progress) < 1e-3, "CSS variable out of sync");
        check(Math.abs(quarter.stageTop) < 1, `stage not pinned (top ${quarter.stageTop})`);
        check(
          quarter.front > quarter.far && quarter.far > 0,
          `layers far ${quarter.far} front ${quarter.front}`,
        );
        check(
          Math.abs(quarter.front / quarter.far - 10) < 0.5,
          `depth ratio ${quarter.front / quarter.far}`,
        );
        await scrollScene(0.1);
        const early = await sceneState();
        check(
          Math.abs(early.caption - early.progress / 0.3) < 0.05,
          `caption opacity ${early.caption}`,
        );
        await scrollScene(0.5);
        const middle = await sceneState();
        check(Math.abs(middle.caption - 1) < 1e-3, `caption opacity ${middle.caption}`);
        check(Math.abs(middle.front) < 1, `front layer at progress 0.5: ${middle.front}`);
      },
    );

    await run("scene: viewport resize re-measures and keeps progress consistent", async () => {
      const before = await sceneState();
      await p.setViewport(800, 600);
      // Consistent: re-measured, the cached geometry equals the live one, the published progress
      // equals the one the live layout implies, and the stage stays pinned.
      const consistent = `(() => { const s = ${sceneStateExpression}; return Math.abs(s.progress - s.real) < 1e-3 && Math.abs(s.stageTop) < 1 && Math.abs(s.cached.top - s.live.top) < 0.5 && Math.abs(s.cached.distance - s.live.distance) < 0.5; })()`;
      await until(
        "re-measured after resize",
        `window.__neshelLab.sceneMeasurements > ${before.measurements} && window.innerHeight === 600 && ${consistent}`,
        sceneStateExpression,
      );
      await p.setViewport(1280, 900);
      await until(
        "consistent after restoring the viewport",
        `window.innerHeight === 900 && ${consistent}`,
        sceneStateExpression,
      );
    });

    for (const item of sceneShiftCases) {
      await run(item.id, () => runSceneShiftCase(evaluate, item));
    }

    await run("scene: smooth scrub lags behind then converges", async () => {
      await p.evaluate(`document.getElementById("scene-smooth").click()`);
      await scrollScene(0.1); // the spring settles on its target, so consistency is reached
      const y = await evaluate(sceneScrollExpression(0.9));
      // Lag is measured in frames, not milliseconds: the spring cannot cover 0.8 in 3 frames
      // (delta is clamped to 1/15 s per frame), however slow the runner is.
      await p.evaluate(framesExpression(3));
      const lagging = await sceneState();
      check(lagging.progress < 0.8, `progress after 3 frames: ${lagging.progress}`);
      await until("smooth scrub converged", sceneConsistentCondition(y), sceneStateExpression);
      await p.evaluate(`document.getElementById("scene-smooth").click()`);
    });

    notes.scrollDrivenAnimations = await p.evaluate(`CSS.supports("animation-timeline: view()")`);
    notes.viewTransitions = await p.evaluate(`typeof document.startViewTransition === "function"`);

    // Phase 009 engine suite (runs inside the page; shared with the Playwright engine check).
    await p.evaluate(`document.getElementById("engine-title").scrollIntoView()`);
    const engineCases = await p.evaluate("window.__neshelLab.engine.runEngineSuite()");
    for (const item of engineCases) cases.push(item);

    await run("controller: reduced motion completes immediately at the end value", async () => {
      await motionPreference("reduce");
      const result = await p.evaluate(`(async () => {
        const started = performance.now();
        const control = window.__neshelLab.engine.api.animate(80, 5000);
        const result = await control.finished;
        window.__neshelLab.engine.api.animate(0, 0);
        window.__neshelLab.engine.api.unbind();
        return { ...result, ms: performance.now() - started };
      })()`);
      await motionPreference("no-preference");
      check(result.status === "completed" && result.value === 80, JSON.stringify(result));
      check(result.ms < 500, `took ${result.ms} ms`);
    });

    // Phase 010 effects gallery: in-page rendering suite, then real mouse/keyboard input.
    await p.evaluate(`document.getElementById("effects-title").scrollIntoView()`);
    const effectCases = await p.evaluate("window.__neshelLab.effects.runEffectsSuite()");
    for (const item of effectCases) cases.push(item);
    let pointerAt = [2, 2];
    for (const item of effectsInputCases) {
      await run(item.id, async () => {
        await scrollIntoView(item.target);
        const r = await rectOf(item.target);
        const state = fxStateExpression(item.target);
        for (const [index, step] of item.steps.entries()) {
          if (step.action === "hover") {
            pointerAt = [r.left + r.width * step.at[0], r.top + r.height * step.at[1]];
            await mouse(...pointerAt);
          } else if (step.action === "leave") {
            pointerAt = [2, 2];
            await mouse(2, 2);
          } else if (step.action === "down" || step.action === "up") {
            await p.send("Input.dispatchMouseEvent", {
              type: step.action === "down" ? "mousePressed" : "mouseReleased",
              x: pointerAt[0],
              y: pointerAt[1],
              button: "left",
              clickCount: 1,
            });
          } else if (step.action === "focus" || step.action === "blur") {
            await p.evaluate(
              `document.querySelector(${JSON.stringify(item.target)}).${step.action}()`,
            );
          } else if (step.action === "keydown" || step.action === "keyup") {
            await p.send("Input.dispatchKeyEvent", {
              type: step.action === "keydown" ? "rawKeyDown" : "keyUp",
              key: step.key,
              code: "Space",
              windowsVirtualKeyCode: 32,
            });
          }
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
        await motionPreference("reduce");
        // A 600 ms count and a spring travel cannot finish by themselves within the ceiling below.
        assertUntil(
          await evaluate(untilExpression(pressLiveReducedDone, pressLiveReducedState, 300)),
          "final state right after the preference changed",
          300,
        );
        await motionPreference("no-preference");
      },
    );

    await run(
      "effects: reduced motion (emulated, live) — the lift renders its shadow without moving",
      async () => {
        await motionPreference("reduce");
        const state = fxStateExpression("#hover-lift");
        await scrollIntoView("#hover-lift");
        const r = await rectOf("#hover-lift");
        await mouse(r.left + r.width / 2, r.top + r.height / 2);
        await until(
          "shadow without movement",
          `((s) => s.lift === "1" && s.inline === "" && s.reducedQuery)(${state})`,
          state,
        );
        await mouse(2, 2);
        await motionPreference("no-preference");
        await until("rest", `((s) => s.lift === "" && !s.reducedQuery)(${state})`, state);
      },
    );
    // Phase 011 scroll gallery: in-page suite in real layout, then the live reduced-motion switch.
    await p.evaluate(`document.getElementById("scroll-title").scrollIntoView()`);
    const scrollCases = await p.evaluate("window.__neshelLab.scroll.runScrollSuite()");
    for (const item of scrollCases) cases.push(item);
    await run(
      "scroll: reduced motion switched on live — horizontal section stacks, decorative layers stop",
      async () => {
        await motionPreference("reduce");
        await until(
          "static alternatives",
          `(() => { const f = window.__neshelLab.scroll.reducedFacts(); return f.reduced && f.hscroll === "stacked" && f.dot === "" && f.scene === "" && f.skew === ""; })()`,
          "window.__neshelLab.scroll.reducedFacts()",
        );
        await motionPreference("no-preference");
        await until(
          "pinned again",
          `window.__neshelLab.scroll.reducedFacts().hscroll === "pinned"`,
          "window.__neshelLab.scroll.reducedFacts()",
        );
      },
    );
    notes.effects = await p.evaluate("window.__neshelLab.notes");

    await run("axe: no violations on the lab page", async () => {
      await p.evaluate("window.scrollTo(0, 0)");
      await p.evaluate(axeSource);
      const violations = await p.evaluate(
        `axe.run(document, { resultTypes: ["violations"] }).then((r) => r.violations.map((v) => v.id + " (" + v.impact + "): " + v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")))`,
      );
      check(violations.length === 0, violations.join(" | "));
    });

    await run("no page errors during the whole run", async () => {
      check(p.errors.length === 0, p.errors.join(" | "));
    });
  } finally {
    await browser.close();
  }

  const failures = cases.filter((item) => !item.ok);
  for (const item of cases) {
    console.info(`${item.ok ? "ok  " : "FAIL"} ${item.id}${item.ok ? "" : `\n     ${item.error}`}`);
  }
  console.info(`notes: ${JSON.stringify(notes)}`);
  const reportPath = argValue("--report");
  if (reportPath) {
    mkdirSync(resolve(reportPath, ".."), { recursive: true });
    writeFileSync(
      reportPath,
      `${JSON.stringify({ browser: browser.version, cases, notes }, null, 2)}\n`,
    );
  }
  if (failures.length) {
    console.error(`check:browser:animations failed: ${failures.length} of ${cases.length} cases.`);
    process.exitCode = 1;
  } else {
    console.info(`check:browser:animations passed: ${cases.length} cases.`);
  }
}

main().catch((error) => {
  console.error(`check:browser:animations could not complete: ${error.message}`);
  process.exitCode = 1;
});
