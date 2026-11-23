// Phase 016 K-16 (owner decision, PR #17): the ONLY allowed skip in the animations browser checks. A Phase 016 GPU
// row that needs WebGL2 may be reported as SKIPPED — never as passed — when, and only when, ALL of these hold:
//   - the engine is Playwright Firefox,
//   - the operating system is Linux,
//   - the row is one of the WebGL2-requiring GPU rows (allowlisted by id),
//   - the row failed with the suite's NO_WEBGL2 marker (the environment exposes no WebGL2).
// Every other failure stays a failure, including NO_WEBGL2 on any other engine or OS.

/** Ids (prefixes) of the rows that need WebGL2: the four GPU effects, context loss and the shader-failure fallback. */
export const WEBGL2_ROWS = [
  "D04 page curl (GPU)",
  "D06 ripple (GPU)",
  "D08 displacement map (GPU)",
  "D10 depth parallax (GPU)",
  "GPU context loss",
  "GPU fallback on a shader failure",
];

export const NO_WEBGL2 = "NO_WEBGL2";

/** Whether a failed row may be skipped under K-16. */
export function isK16Skip(item, { engine, platform }) {
  return (
    !item.ok &&
    engine === "firefox" &&
    platform === "linux" &&
    WEBGL2_ROWS.some((prefix) => String(item.id).startsWith(prefix)) &&
    String(item.error ?? "").startsWith(NO_WEBGL2)
  );
}

/**
 * Give every case an explicit `status` ("passed" | "skipped" | "failed"). Skipped cases keep `ok: false` (they are
 * not passes) and carry `skip: { rule: "K-16", reason, engine, os }`.
 */
export function classifyCases(items, { engine, platform }) {
  return items.map((item) => {
    if (item.ok) return { ...item, status: "passed" };
    if (isK16Skip(item, { engine, platform })) {
      return {
        ...item,
        status: "skipped",
        skip: { rule: "K-16", reason: String(item.error), engine, os: platform },
      };
    }
    return { ...item, status: "failed" };
  });
}

/** Counts by status. */
export function countStatuses(cases) {
  const counts = { total: cases.length, passed: 0, skipped: 0, failed: 0 };
  for (const item of cases) {
    const status = item.status ?? (item.ok ? "passed" : "failed");
    counts[status] += 1;
  }
  return counts;
}
