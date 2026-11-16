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
 * ScrollScene state: the prototype's progress and cached geometry next to the live geometry, the
 * progress the live layout implies (`real`), the stage position and the document height.
 */
export const sceneStateExpression = `(() => {
  const section = document.getElementById("scene");
  const stage = document.getElementById("scene-stage");
  const rect = section.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const distance = section.offsetHeight - window.innerHeight;
  const ty = (id) => new DOMMatrix(getComputedStyle(document.getElementById(id)).transform).m42;
  const lab = window.__neshelLab;
  return {
    scrollY: window.scrollY,
    progress: lab.sceneProgress,
    real: Math.min(1, Math.max(0, (window.scrollY - top) / distance)),
    css: Number(stage.style.getPropertyValue("--scene-progress")),
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
