// Shared, condition-based helpers for the animations lab checks (CDP: check-animations-browser.mjs;
// Playwright: check-animations-engines.mjs). Each helper returns a JavaScript expression evaluated in
// the page, so both harnesses run identical logic.
//
// No fixed sleeps decide a result: `untilExpression` polls an observable condition until it holds or
// a maximum time passes, and then fails with the page state that did not satisfy it. The maximum is a
// ceiling for slow runners, not a delay: a passing condition returns as soon as it holds.

/** Default ceiling (ms) for a condition that a healthy page satisfies within a few frames. */
export const CONDITION_TIMEOUT = 5000;

/**
 * Expression resolving to `{ ok, ms, state }`: polls `condition` (a JS expression) every 16 ms until
 * it is truthy or `timeout` ms pass; `state` is `describe` (a JS expression) at the end.
 */
export function untilExpression(condition, describe, timeout = CONDITION_TIMEOUT) {
  return `new Promise((resolve) => {
    const start = performance.now();
    const step = () => {
      let ok = false;
      try { ok = Boolean(${condition}); } catch {}
      const ms = performance.now() - start;
      if (ok || ms > ${timeout}) {
        let state;
        try { state = ${describe}; } catch (error) { state = String(error); }
        resolve({ ok, ms: Math.round(ms), state });
      } else setTimeout(step, 16);
    };
    step();
  })`;
}

/** Throw a diagnostic error when an `untilExpression` result did not hold. */
export function assertUntil(result, label, timeout = CONDITION_TIMEOUT) {
  if (!result.ok) {
    throw new Error(`${label}: not reached within ${timeout} ms; ${JSON.stringify(result.state)}`);
  }
  return result;
}

/** Expression resolving after `count` animation frames (for "nothing must happen" checks). */
export function framesExpression(count) {
  return `new Promise((resolve) => { let n = ${count}; const f = () => (--n <= 0 ? resolve() : requestAnimationFrame(f)); requestAnimationFrame(f); })`;
}

/** Tilt3D state of `selector` (data attribute, inline transform and rotations). */
export function tiltStateExpression(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const angle = (axis) => Number(new RegExp("rotate" + axis + "\\\\((-?[\\\\d.]+)deg\\\\)").exec(el.style.transform)?.[1] ?? 0);
    return { state: el.getAttribute("data-neshel-tilt"), inline: el.style.transform, rx: angle("X"), ry: angle("Y"), computed: getComputedStyle(el).transform, translate: getComputedStyle(el).translate, reducedQuery: matchMedia("(prefers-reduced-motion: reduce)").matches };
  })()`;
}

/**
 * ScrollScene state (package API since Phase 011): the scene's progress and cached geometry next to the live geometry, the
 * progress the live layout implies (`real`), the stage position and the document height.
 */
export const sceneStateExpression = `(() => {
  const section = document.getElementById("scene");
  const stage = section.querySelector(".neshel-scene-stage");
  const rect = section.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const distance = section.offsetHeight - window.innerHeight;
  const ty = (id) => new DOMMatrix(getComputedStyle(document.getElementById(id)).transform).m42;
  const lab = window.__neshelLab;
  return {
    scrollY: window.scrollY,
    progress: lab.sceneProgress,
    real: Math.min(1, Math.max(0, (window.scrollY - top) / distance)),
    css: Number(getComputedStyle(section).getPropertyValue("--neshel-scene-progress")),
    stageTop: stage.getBoundingClientRect().top,
    far: ty("scene-layer-far"),
    front: ty("scene-layer-front"),
    caption: Number(getComputedStyle(document.getElementById("scene-caption")).opacity),
    measurements: lab.sceneMeasurements,
    cached: lab.sceneGeometry,
    live: { top, distance },
    documentHeight: document.documentElement.scrollHeight,
  };
})()`;

/** Expression scrolling to `fraction` of the scene from the live geometry; resolves to the target y. */
export function sceneScrollExpression(fraction) {
  return `(() => {
    const section = document.getElementById("scene");
    const top = section.getBoundingClientRect().top + window.scrollY;
    const y = top + (section.offsetHeight - window.innerHeight) * ${fraction};
    window.scrollTo(0, y);
    return y;
  })()`;
}

/**
 * Condition: the scroll reached `y` (when given), the stage is pinned, and the published progress
 * (and the CSS variable) equal the progress the live layout implies. A stale geometry cache never
 * satisfies it, whatever the runner speed.
 */
export function sceneConsistentCondition(y) {
  return `(() => {
    const s = ${sceneStateExpression};
    return ${y === undefined ? "true" : `Math.abs(s.scrollY - Math.min(${y}, document.documentElement.scrollHeight - window.innerHeight)) < 1`}
      && Math.abs(s.progress - s.real) < 1e-3 && Math.abs(s.css - s.progress) < 1e-3 && Math.abs(s.stageTop) < 1;
  })()`;
}

/**
 * Regression cases for geometry invalidation: each mutation moves the scene in the document without
 * changing the scene section's size. `apply` performs the mutation and returns the facts that prove
 * the case is what it claims (shift of the scene, document height before/after); `verify` checks
 * them; `undo` restores the page.
 */
export const sceneShiftCases = [
  {
    id: "scene: content above grows after measurement (document grows)",
    // An existing element above the scene (inserted and measured first) changes its height. The
    // spacers keep a 1px height so no margin collapses through them and the shift is exact.
    setup: `(() => { const a = document.createElement("div"); a.id = "scene-test-above"; a.style.height = "1px"; document.querySelector(".lab-header").after(a); })()`,
    apply: `(() => {
      const before = { top: document.getElementById("scene").getBoundingClientRect().top + window.scrollY, height: document.documentElement.scrollHeight };
      document.getElementById("scene-test-above").style.height = "601px";
      const after = { top: document.getElementById("scene").getBoundingClientRect().top + window.scrollY, height: document.documentElement.scrollHeight };
      return { shift: after.top - before.top, heightChange: after.height - before.height };
    })()`,
    verify: (facts) => Math.abs(facts.shift - 600) < 2 && Math.abs(facts.heightChange - 600) < 2,
    undo: `document.getElementById("scene-test-above")?.remove()`,
  },
  {
    id: "scene: compensated shift (above grows, below shrinks; document size unchanged)",
    setup: `(() => { const a = document.createElement("div"); a.id = "scene-test-above"; a.style.height = "1px"; document.querySelector(".lab-header").after(a); const d = document.createElement("div"); d.id = "scene-test-below"; d.style.height = "601px"; document.querySelector(".lab").append(d); })()`,
    apply: `(() => {
      const before = { top: document.getElementById("scene").getBoundingClientRect().top + window.scrollY, height: document.documentElement.scrollHeight };
      document.getElementById("scene-test-above").style.height = "601px";
      document.getElementById("scene-test-below").style.height = "1px";
      const after = { top: document.getElementById("scene").getBoundingClientRect().top + window.scrollY, height: document.documentElement.scrollHeight };
      return { shift: after.top - before.top, heightChange: after.height - before.height };
    })()`,
    verify: (facts) => Math.abs(facts.shift - 600) < 2 && Math.abs(facts.heightChange) < 1,
    undo: `(() => { document.getElementById("scene-test-above")?.remove(); document.getElementById("scene-test-below")?.remove(); })()`,
  },
  {
    id: "scene: element inserted above, then removed",
    apply: `(() => {
      const before = document.getElementById("scene").getBoundingClientRect().top + window.scrollY;
      const d = document.createElement("div"); d.id = "scene-test-inserted"; d.style.height = "400px";
      document.getElementById("scene-title").before(d);
      return { shift: document.getElementById("scene").getBoundingClientRect().top + window.scrollY - before };
    })()`,
    // The inserted block may also bring a layout gap; the scene moves by at least its height.
    verify: (facts) => facts.shift >= 399,
    undo: `document.getElementById("scene-test-inserted")?.remove()`,
    checkUndo: true,
  },
];

/**
 * Scroll to `fraction` of the scene and wait until the progress is consistent with the live layout
 * and the stage is pinned; returns the scene state. `evaluate(expression)` runs in the page.
 */
export async function scrollSceneTo(evaluate, fraction, label = `scene at ${fraction}`) {
  const y = await evaluate(sceneScrollExpression(fraction));
  assertUntil(
    await evaluate(untilExpression(sceneConsistentCondition(y), sceneStateExpression)),
    `${label}: progress consistent with the scroll position and stage pinned`,
  );
  const state = await evaluate(sceneStateExpression);
  if (Math.abs(state.real - fraction) > 0.02) {
    throw new Error(`${label}: scroll landed at ${state.real}, not ${fraction}`);
  }
  return state;
}

/** Run one `sceneShiftCases` entry; always restores the page. */
export async function runSceneShiftCase(evaluate, item) {
  try {
    if (item.setup) await evaluate(item.setup);
    await scrollSceneTo(evaluate, 0.25, "baseline");
    const facts = await evaluate(item.apply);
    if (!item.verify(facts)) {
      throw new Error(`the mutation did not produce the intended shift: ${JSON.stringify(facts)}`);
    }
    await scrollSceneTo(evaluate, 0.5, "after the shift");
    if (item.checkUndo) {
      await evaluate(item.undo);
      await scrollSceneTo(evaluate, 0.25, "after the undo");
    }
  } finally {
    await evaluate(item.undo);
  }
  await scrollSceneTo(evaluate, 0.25, "restored page");
}

/**
 * Phase 010 effect state of `selector`: inline transform and engine custom properties, the computed
 * transform matrix (translation y, scale x), the decor layer's box-shadow and whether an owned ripple
 * layer exists.
 */
export function fxStateExpression(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return {
      inline: el.style.transform,
      tokens: el.getAttribute("data-neshel-fx"),
      lift: el.style.getPropertyValue("--neshel-lift-progress"),
      glow: el.style.getPropertyValue("--neshel-glow-progress"),
      ty: m.f, tx: m.e, sx: Math.hypot(m.a, m.b), rotated: Math.abs(m.m13) + Math.abs(m.m23) > 1e-4,
      shadow: getComputedStyle(el, "::before").boxShadow,
      ripple: !!el.querySelector(".neshel-ripple-layer"),
      reducedQuery: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  })()`;
}

/** Real-input cases of the Phase 010 gallery, shared by the CDP and Playwright harnesses. */
export const effectsInputCases = [
  {
    id: "effects: real mouse lifts #hover-lift and renders the decor shadow; leaving returns to rest",
    target: "#hover-lift",
    steps: [
      { action: "hover", at: [0.5, 0.5] },
      {
        until: `s.lift === "1" && Math.abs(s.ty + 6) < 0.5 && /rgba?[(]/.test(s.shadow) && !/^none$/.test(s.shadow)`,
      },
      { action: "leave" },
      { until: `s.inline === "" && s.lift === ""` },
    ],
  },
  {
    id: "effects: real mouse press on #press-ripple creates the owned ripple layer; release removes it",
    target: "#press-ripple",
    steps: [
      { action: "hover", at: [0.3, 0.5] },
      { action: "down" },
      { until: "s.ripple" },
      { action: "up" },
      { until: "!s.ripple" },
      { action: "leave" },
    ],
  },
  {
    id: "effects: keyboard Space on the focused #press-scale presses; keyup releases",
    target: "#press-scale",
    steps: [
      { action: "focus" },
      { action: "keydown", key: " " },
      { until: "Math.abs(s.sx - 0.96) < 0.005" },
      { action: "keyup", key: " " },
      { until: `s.inline === ""` },
      { action: "blur" },
    ],
  },
  {
    id: "effects: #combo composes lift (translate), Tilt3D (rotation) and press (scale) under real input",
    target: "#combo",
    steps: [
      { action: "hover", at: [0.5, 0.5] },
      { action: "hover", at: [0.95, 0.1] },
      { action: "down" },
      {
        until: `/translate3d/.test(s.inline) && /rotateX/.test(s.inline) && /scale[(]/.test(s.inline) && s.glow === "1" && s.ripple`,
      },
      { action: "up" },
      { action: "leave" },
      { until: `s.inline === "" && !s.ripple` },
    ],
  },
  {
    id: "effects: magnetic follows the real mouse and springs back",
    target: "#hover-magnetic",
    steps: [
      { action: "hover", at: [0.5, 0.5] },
      { action: "hover", at: [0.98, 0.5] },
      { until: "s.tx > 4" },
      { action: "leave" },
      { until: `s.inline === ""` },
    ],
  },
];

/**
 * Owner review of PR #7: start a press animation, then the harness switches the emulated preference to
 * `reduce` mid-run; the condition must hold quickly (the run jumps to its final state).
 */
export const pressLiveReducedStart = `(() => {
  const toggle = document.getElementById("press-toggle");
  window.__liveReduced = { checked: toggle.getAttribute("aria-checked") };
  toggle.click();
  document.getElementById("press-number-add").click();
  return true;
})()`;
export const pressLiveReducedDone = `(() => {
  const toggle = document.getElementById("press-toggle");
  const thumb = toggle.querySelector(".neshel-toggle-thumb");
  const [visual, accessible] = document.getElementById("press-number").children;
  return toggle.getAttribute("aria-checked") !== window.__liveReduced.checked && thumb.style.cssText === ""
    && visual.textContent === accessible.textContent && matchMedia("(prefers-reduced-motion: reduce)").matches;
})()`;
export const pressLiveReducedState = `(() => ({
  thumb: document.querySelector("#press-toggle .neshel-toggle-thumb").style.cssText,
  number: [...document.getElementById("press-number").children].map((el) => el.textContent),
}))()`;
