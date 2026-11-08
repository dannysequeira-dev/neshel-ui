// Capsize geometry in a real browser (feature 004 SC-004, FR-040, FR-045; ADR 0011).
// The font actually rendered differs per OS, so the page measures it (canvas TextMetrics: cap
// height from "H", ascent/descent from the font bounding box), writes the matching metric
// custom properties, renders typography markup from the built package, and checks that the
// trimmed box starts at the first line's cap height and ends at the last line's baseline.
// A deliberately wrong metric set must be detected (negative control).

export const FAMILY = "sans-serif";

/** Markup cases (rendered with React on the server side of the check). */
export function typographyCases(h, T) {
  const marker = (key) =>
    h("span", { "data-marker": key, style: { display: "inline-block", width: 0, height: 0 } });
  const text = (content) => [marker("first"), content, marker("last")];
  return [
    { id: "single-3xl", element: h(T.Paragraph, { size: "3xl" }, ...text("HÉxg Ñandú")) },
    {
      id: "multi-base",
      width: 180,
      element: h(
        T.Paragraph,
        { size: "base" },
        ...text(
          "Beautiful typography begins with precision, line after line of accented Ångström text.",
        ),
      ),
    },
    {
      id: "heading-5xl-tight",
      element: h(T.Heading, { as: "h2", size: "5xl", leading: "tight" }, ...text("Hg")),
    },
    { id: "caption-sm", element: h(T.Caption, null, ...text("Updated recently")) },
    {
      id: "untrimmed",
      element: h(T.Paragraph, { size: "3xl", trim: false }, ...text("HÉxg")),
      untrimmed: true,
    },
    {
      id: "truncate",
      width: 120,
      element: h(
        T.Paragraph,
        { truncate: true },
        ...text("A very long line that must be truncated"),
      ),
      untrimmed: true,
    },
  ];
}

/** In-page script: measure the rendered font and install matching (or skewed) metric tokens. */
export const installMetrics = (skew = 0) => `(() => {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = "200px ${FAMILY}";
  const h = ctx.measureText("H");
  const box = ctx.measureText("Hg");
  const em = 200;
  const cap = h.actualBoundingBoxAscent / em;
  const ascent = box.fontBoundingBoxAscent / em;
  const descent = box.fontBoundingBoxDescent / em;
  const style = document.documentElement.style;
  style.setProperty("--neshel-font-body", "${FAMILY}");
  style.setProperty("--neshel-font-display", "${FAMILY}");
  for (const role of ["body", "display"]) {
    style.setProperty("--neshel-font-" + role + "-scale", "1");
    style.setProperty("--neshel-font-" + role + "-cap-trim", String((ascent - descent) / 2 - cap + ${skew}));
    style.setProperty("--neshel-font-" + role + "-baseline-trim", String((descent - ascent) / 2));
    style.setProperty("--neshel-font-" + role + "-trim", "1");
  }
  return { cap, ascent, descent };
})()`;

/** In-page probe of one case: box edges vs cap top of the first line and last baseline. */
export const probeCase = (id) => `(() => {
  const host = document.querySelector('[data-type-case="${id}"]');
  const el = host.firstElementChild;
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const first = el.querySelector('[data-marker="first"]').getBoundingClientRect();
  const last = el.querySelector('[data-marker="last"]').getBoundingClientRect();
  const before = getComputedStyle(el, "::before");
  return {
    top: rect.top, bottom: rect.bottom, height: rect.height,
    firstBaseline: first.bottom, lastBaseline: last.bottom,
    fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight),
    overflow: style.overflow, beforeContent: before.content, beforeMargin: before.marginBlockEnd,
  };
})()`;

/** Compare a probe with the expected geometry (tolerance 1 px). */
export function geometryFailures(label, testCase, metrics, probe) {
  const failures = [];
  const capPx = metrics.cap * probe.fontSize;
  const near = (a, b) => Math.abs(a - b) <= 1;
  if (testCase.untrimmed) {
    if (probe.beforeContent !== "none" && probe.beforeContent !== "normal") {
      failures.push(
        `${label} ${testCase.id}: untrimmed element has ::before content ${probe.beforeContent}`,
      );
    }
    if (near(probe.top, probe.firstBaseline - capPx)) {
      failures.push(`${label} ${testCase.id}: untrimmed box starts at the cap height`);
    }
    return failures;
  }
  if (!near(probe.top, probe.firstBaseline - capPx)) {
    failures.push(
      `${label} ${testCase.id}: box top ${probe.top.toFixed(2)} vs first-line cap top ${(probe.firstBaseline - capPx).toFixed(2)}`,
    );
  }
  if (!near(probe.bottom, probe.lastBaseline)) {
    failures.push(
      `${label} ${testCase.id}: box bottom ${probe.bottom.toFixed(2)} vs last baseline ${probe.lastBaseline.toFixed(2)}`,
    );
  }
  if (probe.overflow !== "visible") {
    failures.push(`${label} ${testCase.id}: trimming must not clip (overflow ${probe.overflow})`);
  }
  return failures;
}
