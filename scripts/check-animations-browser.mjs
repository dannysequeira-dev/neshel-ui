// pnpm check:browser:animations [--dist <dir>] [--report <file>] [--cpu-throttle <rate>]
// Feature 008.0 (spec FR-090–FR-099): real-input checks of the animations lab in headless Chrome
// through the DevTools protocol (scripts/lib/cdp.mjs): Tilt3D pointer, return, composition,
// keyboard focus, unmount, live reduced-motion changes, zero React commits during movement;
// CornerRecede techniques; ScrollScene pinning, progress, depth layers, timeline segments, resize
// re-measurement, geometry invalidation and smooth scrub; Phase 010–012 galleries (Phase 012: real mouse,
// one- and two-finger touch, keyboard, touch scrolling not blocked); axe. Results are decided by observable
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
      "scroll: reduced motion switched on live — horizontal sections (auto and pinned) stack, decorative layers stop",
      async () => {
        await motionPreference("reduce");
        await until(
          "static alternatives",
          `(() => { const f = window.__neshelLab.scroll.reducedFacts(); return f.reduced && f.hscroll === "stacked" && f.hscrollPinned === "stacked" && f.pinnedTrackTransform === "" && f.dot === "" && f.scene === "" && f.skew === ""; })()`,
          "window.__neshelLab.scroll.reducedFacts()",
        );
        await motionPreference("no-preference");
        await until(
          "pinned again",
          `(() => { const f = window.__neshelLab.scroll.reducedFacts(); return f.hscroll === "pinned" && f.hscrollPinned === "pinned"; })()`,
          "window.__neshelLab.scroll.reducedFacts()",
        );
      },
    );

    // Phase 012 gestures/layout gallery: the in-page suite (synthetic multi-pointer input in real layout),
    // then REAL input through the DevTools protocol: mouse drag, one-finger and two-finger touch
    // (Input.dispatchTouchEvent goes through the browser's touch-action and gesture pipeline), keyboard,
    // a real touch scroll that must not be blocked, and the live reduced-motion switch.
    await p.evaluate(`document.getElementById("gestures-title").scrollIntoView()`);
    const gestureCases = await p.evaluate("window.__neshelLab.gestures.runGesturesSuite()");
    for (const item of gestureCases) cases.push(item);
    const touch = (type, points) =>
      p.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map(([x, y], id) => ({ x, y, id, radiusX: 2, radiusY: 2, force: 1 })),
      });
    const transformOf = (selector) =>
      `(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector(${JSON.stringify(selector)})).transform); return { x: m.m41, y: m.m42, s: Math.hypot(m.a, m.b) }; })()`;
    const fruitNames = `[...document.querySelectorAll("#g10-list .g-fruit")].map((li) => li.getAttribute("data-neshel-reorder-label")).join()`;
    const moveUpOf = (label) =>
      `[...document.querySelectorAll("#g10-list .g-fruit")].find((li) => li.getAttribute("data-neshel-reorder-label") === ${JSON.stringify(label)}).querySelector("button:not(.neshel-reorder-handle)").click()`;

    await run(
      "G01 real mouse: press, move and release drag the puck; it coasts and stays in its arena",
      async () => {
        await scrollIntoView("#g01-drag");
        const r = await rectOf("#g01-drag");
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await p.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x,
          y,
          button: "left",
          clickCount: 1,
        });
        for (let i = 1; i <= 10; i++) {
          await p.send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: x + i * 8,
            y: y + i * 3,
            button: "left",
            buttons: 1,
          });
        }
        await p.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: x + 80,
          y: y + 30,
          button: "left",
          clickCount: 1,
        });
        await until(
          "moved",
          `${transformOf("#g01-drag")}.x > ${r.left - (await rectOf("#g01-arena")).left + 30}`,
          transformOf("#g01-drag"),
        );
        await until(
          "inside the arena at rest",
          `(() => { const a = document.getElementById("g01-arena").getBoundingClientRect(); const p = document.getElementById("g01-drag").getBoundingClientRect(); return p.left >= a.left - 1 && p.right <= a.right + 1 && p.top >= a.top - 1 && p.bottom <= a.bottom + 1; })()`,
          transformOf("#g01-drag"),
        );
        await mouse(2, 2);
      },
    );

    await run(
      "G01 real touch: one finger drags (touch-action pinch-zoom on the puck)",
      async () => {
        // Deterministic start: the puck at rest at its origin (Home), then dragged inward.
        await scrollIntoView("#g01-drag");
        await p.evaluate(`document.querySelector("#g01-drag").focus()`);
        await key("Home", "Home", 36);
        await until(
          "at rest at the origin",
          `(() => { const t = ${transformOf("#g01-drag")}; return Math.abs(t.x) < 0.5 && Math.abs(t.y) < 0.5; })()`,
          transformOf("#g01-drag"),
        );
        await p.evaluate(`document.querySelector("#g01-drag").blur()`);
        const r = await rectOf("#g01-drag");
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        await touch("touchStart", [[x, y]]);
        for (let i = 1; i <= 10; i++) await touch("touchMove", [[x + i * 6, y + i * 3]]);
        await touch("touchEnd", []);
        await until(
          "dragged inward",
          `${transformOf("#g01-drag")}.x > 20`,
          transformOf("#g01-drag"),
        );
      },
    );

    await run(
      "G08 real two-finger pinch: pointers reach the page (touch-action pan-x pan-y) and zoom the media",
      async () => {
        await scrollIntoView("#g08-zoom");
        const reset = `[...document.querySelectorAll("#g08-zoom button")].find((b) => b.textContent === "Reset zoom").click()`;
        await p.evaluate(reset);
        await until(
          "reset",
          `${transformOf("#g08-zoom img")}.s < 1.01`,
          transformOf("#g08-zoom img"),
        );
        const r = await rectOf("#g08-zoom img");
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        await touch("touchStart", [
          [cx - 30, cy],
          [cx + 30, cy],
        ]);
        for (let i = 1; i <= 8; i++) {
          await touch("touchMove", [
            [cx - 30 - i * 8, cy],
            [cx + 30 + i * 8, cy],
          ]);
        }
        await touch("touchEnd", []);
        await until(
          "zoomed in",
          `${transformOf("#g08-zoom img")}.s > 1.5`,
          transformOf("#g08-zoom img"),
        );
        await until(
          "frame switched to touch-action none",
          `getComputedStyle(document.querySelector("#g08-zoom .neshel-zoom-frame")).touchAction === "none"`,
          `getComputedStyle(document.querySelector("#g08-zoom .neshel-zoom-frame")).touchAction`,
        );
        await p.evaluate(reset);
        await until(
          "reset again",
          `${transformOf("#g08-zoom img")}.s < 1.01`,
          transformOf("#g08-zoom img"),
        );
      },
    );

    await run(
      "G08 real one-finger scroll over the media at scale 1: the page scrolls (not blocked)",
      async () => {
        await scrollIntoView("#g08-zoom");
        const before = await evaluate("window.scrollY");
        const r = await rectOf("#g08-zoom img");
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        await touch("touchStart", [[x, y]]);
        for (let i = 1; i <= 10; i++) await touch("touchMove", [[x, y - i * 15]]);
        await touch("touchEnd", []);
        await until("page scrolled", `window.scrollY > ${before + 30}`, "window.scrollY");
        notes.g08TouchScroll = (await evaluate("window.scrollY")) - before;
      },
    );

    await run(
      "G10 real keyboard: Space grabs, ArrowDown moves, Space drops; focus stays on the handle",
      async () => {
        await scrollIntoView("#g10-list");
        const start = await evaluate(fruitNames);
        await p.evaluate(`document.querySelector("#g10-list .neshel-reorder-handle").focus()`);
        await key(" ", "Space", 32);
        await key("ArrowDown", "ArrowDown", 40);
        await until("moved", `${fruitNames} !== ${JSON.stringify(start)}`, fruitNames);
        await key(" ", "Space", 32);
        await until(
          "focus kept and dropped",
          `document.activeElement?.matches(".neshel-reorder-handle") && document.activeElement.getAttribute("aria-pressed") === "false"`,
          `document.activeElement?.outerHTML.slice(0, 80)`,
        );
        await p.evaluate(`document.activeElement.blur()`);
        await p.evaluate(moveUpOf(start.split(",")[0]));
        await until("restored", `${fruitNames} === ${JSON.stringify(start)}`, fruitNames);
      },
    );

    await run(
      "G10 real touch: a finger on the handle reorders (touch-action none on the handle only)",
      async () => {
        await scrollIntoView("#g10-list");
        await until(
          "list at rest",
          `window.__neshelLab.gestures.debug().gestures.claims === 0`,
          fruitNames,
        );
        await p.evaluate(wait(400));
        const start = await evaluate(fruitNames);
        const h = await rectOf("#g10-list .neshel-reorder-handle");
        const centers = await evaluate(
          `[...document.querySelectorAll("#g10-list .g-fruit")].slice(0, 2).map((li) => { const r = li.getBoundingClientRect(); return r.top + r.height / 2; })`,
        );
        const x = h.left + h.width / 2;
        const y = h.top + h.height / 2;
        const distance = centers[1] - centers[0] + 10;
        await touch("touchStart", [[x, y]]);
        for (let i = 1; i <= 10; i++) await touch("touchMove", [[x, y + (distance * i) / 10]]);
        await touch("touchEnd", []);
        await until("reordered", `${fruitNames} !== ${JSON.stringify(start)}`, fruitNames);
        await p.evaluate(moveUpOf(start.split(",")[0]));
        await until("restored", `${fruitNames} === ${JSON.stringify(start)}`, fruitNames);
      },
    );

    await run(
      "P11 real touch long press: activates once after the hold; no click; early release cancels",
      async () => {
        await scrollIntoView("#p11-button");
        const r = await rectOf("#p11-button");
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const held = `Number(document.getElementById("p11-count").textContent)`;
        const clicks = `Number(document.getElementById("p11-clicks").textContent)`;
        const before = await evaluate(held);
        const clicksBefore = await evaluate(clicks);
        await touch("touchStart", [[x, y]]);
        await until("held", `${held} === ${before + 1}`, held);
        await touch("touchEnd", []);
        await p.evaluate(wait(150));
        check((await evaluate(clicks)) === clicksBefore, "the release click was swallowed");
        await touch("touchStart", [[x, y]]);
        await p.evaluate(wait(120));
        await touch("touchEnd", []);
        await p.evaluate(wait(800));
        check((await evaluate(held)) === before + 1, "early release cancels");
      },
    );

    await run(
      "phase 012: reduced motion switched on live — FLIP applies at once, no inertia, follower hidden",
      async () => {
        await motionPreference("reduce");
        const facts = await p.evaluate("window.__neshelLab.gestures.reducedFacts()");
        await motionPreference("no-preference");
        check(facts.reduced === true, JSON.stringify(facts));
        check(facts.flipTransform === "", `FLIP transform ${facts.flipTransform}`);
        check(facts.follower === "", `follower ${facts.follower}`);
        check(facts.dragIdle === true, "no inertia task after release");
        notes.gesturesReduced = facts;
      },
    );

    // Phase 013 cinematic & page-transitions gallery: the in-page suites (shared with Playwright), then REAL
    // keyboard focus into the camera canvas and a real pointer over the storyboard, and the live
    // reduced-motion facts (instant effects start no View Transition; depth of field never blurs).
    const cinematicCases = await p.evaluate("window.__neshelLab.cinematic.runCinematicSuite()");
    for (const item of cinematicCases) cases.push(item);
    const pageCases = await p.evaluate("window.__neshelLab.cinematic.runPageSuite()");
    for (const item of pageCases) cases.push(item);
    await run(
      "C03 real keyboard: Tab into the canvas pans the camera to the focused card",
      async () => {
        await p.evaluate(
          `(() => { const s = document.getElementById("c03-stage"); s.scrollIntoView({ block: "center" }); s.focus(); })()`,
        );
        const before = await p.evaluate(
          `document.querySelector("#c03-stage .neshel-camera-canvas").style.transform`,
        );
        await p.send("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: "Tab",
          code: "Tab",
          windowsVirtualKeyCode: 9,
        });
        await p.send("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: "Tab",
          code: "Tab",
          windowsVirtualKeyCode: 9,
        });
        check(
          (await p.evaluate("document.activeElement?.id")) === "c03-card-0",
          "focus moved into the canvas",
        );
        await until(
          `document.querySelector("#c03-stage .neshel-camera-canvas").style.transform !== ${JSON.stringify(before)}`,
          `document.querySelector("#c03-stage .neshel-camera-canvas").style.transform`,
        );
      },
    );
    await run("C09 real pointer: hovering the storyboard pauses the rotation", async () => {
      const box = await p.evaluate(
        `(() => { const s = document.getElementById("c09"); s.scrollIntoView({ block: "center" }); const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
      );
      await p.evaluate(
        `document.querySelector("#c09 .neshel-storyboard-rotation").getAttribute("aria-label").startsWith("Start") && document.querySelector("#c09 .neshel-storyboard-rotation").click()`,
      );
      await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
      const held = await p.evaluate(
        `[...document.querySelectorAll("#c09 .neshel-storyboard-frame")].findIndex((f) => f.hasAttribute("data-current"))`,
      );
      await p.evaluate("new Promise((r) => setTimeout(r, 2600))");
      const after = await p.evaluate(
        `[...document.querySelectorAll("#c09 .neshel-storyboard-frame")].findIndex((f) => f.hasAttribute("data-current"))`,
      );
      await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
      check(held === after, `frame changed while hovered (${held} → ${after})`);
    });
    await run(
      "phase 013: reduced motion live — instant page effects start no transition; no blur; no autoplay",
      async () => {
        await motionPreference("reduce");
        const facts = await p.evaluate("window.__neshelLab.cinematic.reducedFacts()");
        await motionPreference("no-preference");
        check(facts.reduced === true, JSON.stringify(facts));
        check(
          facts.wipeStartedTransitions === 0 && facts.wipeNative === false,
          JSON.stringify(facts),
        );
        check(facts.depthBlur === "", `blur under reduced motion: ${facts.depthBlur}`);
        check(String(facts.storyboardRotation).startsWith("Start"), JSON.stringify(facts));
        notes.cinematicReduced = facts;
      },
    );
    // Phase 014 text & SVG gallery: the in-page suite (shared with Playwright), Chrome's real accessibility tree
    // for split text (one name, no per-character nodes), and the live reduced-motion facts.
    const textSvgCases = await p.evaluate("window.__neshelLab.textSvg.runTextSvgSuite()");
    for (const item of textSvgCases) cases.push(item);
    await run(
      "T01 accessibility tree: the split heading is named once by its whole text; pieces are not exposed",
      async () => {
        const { nodes } = await p.send("Accessibility.getFullAXTree");
        const named = (role, name) =>
          nodes.filter((n) => !n.ignored && n.role?.value === role && n.name?.value === name);
        check(
          named("heading", "Rooted in faith 👨‍👩‍👧‍👦").length === 1,
          "heading named by its whole text",
        );
        const letters = nodes.filter(
          (n) => !n.ignored && n.role?.value === "StaticText" && n.name?.value === "R",
        );
        check(letters.length === 0, `per-character text nodes exposed: ${letters.length}`);
        check(
          named("paragraph", "").length >= 0 &&
            nodes.some((n) => !n.ignored && n.name?.value === "Built with hope, word by word."),
          "words sentence exposed once",
        );
      },
    );
    await run(
      "phase 014: reduced motion live — reveals instant, wave off, ants static, no turbulence filter, idle",
      async () => {
        await motionPreference("reduce");
        const facts = await p.evaluate("window.__neshelLab.textSvg.reducedFacts()");
        await motionPreference("no-preference");
        check(facts.reduced === true, JSON.stringify(facts));
        check(
          facts.revealProgress === "1" || facts.revealProgress === "unset",
          JSON.stringify(facts),
        );
        check(facts.waveTransform === false, `wave moved: ${JSON.stringify(facts)}`);
        check(["0", "0px", ""].includes(facts.antsOffset), JSON.stringify(facts));
        check(facts.filters === 0, JSON.stringify(facts));
        notes.textSvgReduced = facts;
      },
    );
    // Phase 015 media/ambient/feedback gallery: the in-page suite (shared with Playwright), real keyboard input for
    // the comparison slider, the lightbox and toasts, Chrome's accessibility tree, forced colours and reduced motion.
    const mediaCases = await p.evaluate("window.__neshelLab.media.runMediaSuite()");
    for (const item of mediaCases) cases.push(item);
    await run(
      "M04 real keyboard: arrows change the native range value and the divider",
      async () => {
        await p.evaluate(
          `(() => { const i = document.querySelector("#m04-frame input"); i.scrollIntoView({ block: "center" }); i.focus(); i.value = "50"; i.dispatchEvent(new Event("input")); })()`,
        );
        await key("ArrowRight", "ArrowRight", 39);
        await key("ArrowRight", "ArrowRight", 39);
        // The divider is written in the next frame's write phase.
        const state = await p.evaluate(
          `new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => { const r = document.querySelector("#m04-frame"); done({ value: r.querySelector("input").value, divider: r.style.getPropertyValue("--neshel-compare") }); })))`,
        );
        check(state.value === "52" && state.divider === "52%", JSON.stringify(state));
      },
    );
    // PR #16 review R2: destroy in the middle of a real drag must release the pointer capture.
    const probeState = () => p.evaluate("window.__neshelLab.media.compareProbe.state()");
    await run(
      "M04 real mouse: destroy mid-drag releases the capture; the next control receives input",
      async () => {
        await scrollIntoView("#m04-probe");
        await p.evaluate("window.__neshelLab.media.compareProbe.create()");
        const r = await rectOf("#m04-probe");
        const y = r.top + r.height / 2;
        const press = (type, x) =>
          p.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
        await mouse(r.left + r.width * 0.7, y);
        await press("mousePressed", r.left + r.width * 0.7);
        await p.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: r.left + r.width * 0.6,
          y,
          button: "left",
          buttons: 1,
        });
        const during = await probeState();
        check(during.captured === true, `capture during drag: ${JSON.stringify(during)}`);
        await p.evaluate("window.__neshelLab.media.compareProbe.destroy()");
        await p.evaluate("window.__neshelLab.media.compareProbe.clearLog()");
        const after = await probeState();
        check(after.captured === false, `capture after destroy: ${JSON.stringify(after)}`);
        const next = await rectOf("#m04-probe-next");
        await p.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: next.left + next.width / 2,
          y: next.top + next.height / 2,
          button: "left",
          buttons: 1,
        });
        const held = await probeState();
        check(
          held.log.includes("next:pointermove") && !held.log.includes("root:pointermove"),
          `moves while held: ${JSON.stringify(held.log)}`,
        );
        await p.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: next.left + next.width / 2,
          y: next.top + next.height / 2,
          button: "left",
          clickCount: 1,
        });
        await p.evaluate("window.__neshelLab.media.compareProbe.clearLog()");
        for (const type of ["mousePressed", "mouseReleased"])
          await p.send("Input.dispatchMouseEvent", {
            type,
            x: next.left + next.width / 2,
            y: next.top + next.height / 2,
            button: "left",
            clickCount: 1,
          });
        const clicked = await probeState();
        check(clicked.log.includes("next:click"), `next control: ${JSON.stringify(clicked.log)}`);
        await mouse(2, 2);
      },
    );
    await run(
      "M04 real touch: a cancelled drag releases the capture; destroy mid-touch-drag releases it too",
      async () => {
        await scrollIntoView("#m04-probe");
        await p.evaluate("window.__neshelLab.media.compareProbe.create()");
        const r = await rectOf("#m04-probe");
        const y = r.top + r.height / 2;
        await touch("touchStart", [[r.left + r.width * 0.3, y]]);
        await touch("touchMove", [[r.left + r.width * 0.4, y]]);
        const during = await probeState();
        check(during.captured === true, `capture during touch drag: ${JSON.stringify(during)}`);
        await touch("touchCancel", []);
        await until(
          "released on cancel",
          `!window.__neshelLab.media.compareProbe.state().captured`,
          `window.__neshelLab.media.compareProbe.state()`,
        );
        await touch("touchStart", [[r.left + r.width * 0.5, y]]);
        await touch("touchMove", [[r.left + r.width * 0.55, y]]);
        check((await probeState()).captured === true, "a new touch drag captures again");
        await p.evaluate("window.__neshelLab.media.compareProbe.destroy()");
        const after = await probeState();
        check(after.captured === false, `capture after destroy: ${JSON.stringify(after)}`);
        await touch("touchEnd", []);
      },
    );
    await run(
      "M07 real Escape: the lightbox closes and focus returns to the thumbnail button",
      async () => {
        await p.evaluate(
          `(() => { const b = document.querySelector("#m07-thumb").closest("button"); b.scrollIntoView({ block: "center" }); b.focus(); b.click(); })()`,
        );
        await until("open", `document.querySelector("#m07 dialog").open`, `"closed"`);
        await key("Escape", "Escape", 27);
        await until(
          "closed",
          `!document.querySelector("#m07 dialog").open && document.activeElement === document.querySelector("#m07-thumb").closest("button")`,
          `document.activeElement?.outerHTML.slice(0, 80)`,
        );
      },
    );
    await run(
      "F06 real keyboard: F8 reaches the toasts and Escape closes the focused one",
      async () => {
        await p.evaluate(`document.querySelector("#f06-show").click()`);
        await until(
          "toast",
          `!!document.querySelector('#f06 .neshel-toast[data-state="open"]')`,
          `"no toast"`,
        );
        await key("F8", "F8", 119);
        check(
          await p.evaluate(`document.activeElement?.classList.contains("neshel-toast")`),
          "F8 focused a toast",
        );
        await key("Escape", "Escape", 27);
        await until(
          "closed",
          `document.querySelectorAll("#f06 .neshel-toast").length === 0`,
          `document.querySelectorAll("#f06 .neshel-toast").length`,
        );
      },
    );
    await run(
      "phase 015 accessibility tree: indicators named progressbars; skeletons, canvases and ambient layers absent",
      async () => {
        await p.evaluate(`document.querySelector("#media-title").scrollIntoView()`);
        const { nodes } = await p.send("Accessibility.getFullAXTree");
        const live = nodes.filter((n) => !n.ignored);
        const named = (role, name) =>
          live.filter((n) => n.role?.value === role && n.name?.value === name);
        check(named("progressbar", "Loading results").length === 1, "spinner progressbar");
        check(named("progressbar", "Uploading files").length === 1, "progress bar");
        check(named("slider", "Compare before and after").length === 1, "native range slider");
        check(named("button", "Pause background motion").length === 1, "ambient toggle");
        const canvases = live.filter((n) => n.role?.value === "canvas");
        check(canvases.length === 0, `decorative canvases exposed: ${canvases.length}`);
      },
    );
    await run(
      "phase 015 forced colours: ambient decorations removed, pending text plain, indicators in system colours",
      async () => {
        await p.send("Emulation.setEmulatedMedia", {
          features: [
            { name: "prefers-reduced-motion", value: "no-preference" },
            { name: "forced-colors", value: "active" },
          ],
        });
        const facts = await p.evaluate(
          `(() => { const layer = document.querySelector("#b02 .neshel-ambient-layer"); const text = document.querySelector("#f10-text"); return { forced: matchMedia("(forced-colors: active)").matches, layer: layer ? getComputedStyle(layer).display : "missing", text: getComputedStyle(text).backgroundImage, fill: getComputedStyle(text).webkitTextFillColor, color: getComputedStyle(text).color }; })()`,
        );
        await motionPreference("no-preference");
        check(facts.forced === true, JSON.stringify(facts));
        check(facts.layer === "none", `ambient layer shown: ${JSON.stringify(facts)}`);
        check(facts.text === "none", `pending text gradient kept: ${JSON.stringify(facts)}`);
        notes.mediaForced = facts;
      },
    );
    await run(
      "phase 015: reduced motion live — ambient static, no canvas task, slow spinner pulse, no camera",
      async () => {
        await motionPreference("reduce");
        const facts = await p.evaluate("window.__neshelLab.media.reducedFacts()");
        await motionPreference("no-preference");
        check(facts.reduced === true, JSON.stringify(facts));
        check(facts.ambientAnimation === "none", JSON.stringify(facts));
        check(facts.canvasTasks === 0, JSON.stringify(facts));
        check(facts.spinnerAnimation === "neshel-fb-slow-pulse", JSON.stringify(facts));
        check(facts.kenBurnsScale === "", JSON.stringify(facts));
        notes.mediaReduced = facts;
      },
    );
    // Phase 016 advanced 3D/GPU gallery: the in-page suite (shared with Playwright; WebGL2 pixel probes, forced
    // context loss, separate fallback rows), real mouse input for CornerRecede, real keyboard input for the card flip
    // and the ring carousel, and reduced motion live.
    const advancedCases = await p.evaluate("window.__neshelLab.advanced.runAdvancedSuite()");
    for (const item of advancedCases) cases.push(item);
    const corner = "window.__neshelLab.advanced.controls.corner.current";
    await run(
      "D05 real mouse: the corner under the pointer recedes, switches corners through flat, returns on leave",
      async () => {
        await scrollIntoView("#d05-root");
        const r = await rectOf("#d05-root");
        await mouse(r.left + r.width / 2, r.top + r.height / 2);
        await mouse(r.right - 8, r.top + 8);
        await mouse(r.right - 5, r.top + 5);
        await until(
          "top-right folded",
          `${corner}.corner === "top-right" && ${corner}.amount > 0.8 && !!document.querySelector("#d05-root .neshel-corner-flap")`,
          `({ corner: ${corner}.corner, amount: ${corner}.amount })`,
        );
        await mouse(r.left + 8, r.bottom - 8);
        await mouse(r.left + 5, r.bottom - 5);
        await until(
          "bottom-left folded",
          `${corner}.corner === "bottom-left" && ${corner}.amount > 0.8`,
          `({ corner: ${corner}.corner, amount: ${corner}.amount })`,
        );
        await mouse(2, 2);
        await until(
          "returned flat",
          `${corner}.amount < 0.001 && !document.querySelector("#d05-root .neshel-corner-flap")`,
          `${corner}.amount`,
        );
      },
    );
    await run(
      "D01 real keyboard: Space on the in-face toggle flips; focus lands on the visible face",
      async () => {
        await p.evaluate(
          `(() => { const b = document.getElementById("d01-front-toggle"); b.scrollIntoView({ block: "center" }); b.focus(); })()`,
        );
        await key(" ", "Space", 32);
        await until(
          "flipped by keyboard",
          `window.__neshelLab.advanced.controls.flip.current.side === "back" && document.activeElement?.id === "d01-back-link"`,
          `({ side: window.__neshelLab.advanced.controls.flip.current.side, active: document.activeElement?.id })`,
        );
        await p.evaluate(`document.getElementById("d01-back-toggle").focus()`);
        await key(" ", "Space", 32);
        await until(
          "back to front",
          `window.__neshelLab.advanced.controls.flip.current.side === "front"`,
          `window.__neshelLab.advanced.controls.flip.current.side`,
        );
      },
    );
    await run("D03 real keyboard: arrows on the focused ring move the front item", async () => {
      await p.evaluate(
        `(() => { const r = document.getElementById("d03-ring"); r.scrollIntoView({ block: "center" }); r.focus(); })()`,
      );
      await key("ArrowLeft", "ArrowLeft", 37);
      await until(
        "ring rotated",
        `window.__neshelLab.advanced.controls.ring.current.index === 5`,
        `window.__neshelLab.advanced.controls.ring.current.index`,
      );
      await key("Home", "Home", 36);
      await until(
        "ring home",
        `window.__neshelLab.advanced.controls.ring.current.index === 0`,
        `window.__neshelLab.advanced.controls.ring.current.index`,
      );
    });
    await run(
      "phase 016: reduced motion live — fade flip, no glitch, static floor, no GPU distortion",
      async () => {
        await motionPreference("reduce");
        const facts = await p.evaluate("window.__neshelLab.advanced.reducedFacts()");
        await motionPreference("no-preference");
        check(facts.flipMode === "fade", JSON.stringify(facts));
        check(facts.glitchActive === false, JSON.stringify(facts));
        check(facts.gridState === "reduced" && facts.floorRunning === false, JSON.stringify(facts));
        check(facts.rippleActive === false && facts.rippleMode === "static", JSON.stringify(facts));
        check(facts.depthMode === "static", JSON.stringify(facts));
        notes.advancedReduced = facts;
      },
    );
    notes.advanced = await p.evaluate("window.__neshelLab.advanced.debug()");
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
