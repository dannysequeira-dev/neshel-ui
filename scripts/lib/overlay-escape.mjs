// K-15 (feature 017): nested-overlay Escape scenarios shared by check:browsers and the
// stress:overlays repetition runner. Playwright page in, assertions out; failures carry a trace.

/**
 * Records Escape-related events (keydown, focus, dialog count, Radix layer updates) with timestamps
 * so a failing nested-overlay case reports what happened, not only its final state.
 */
export function installOverlayTrace() {
  const t0 = performance.now();
  const log = [];
  window.__neshelOverlayTrace = log;
  const stamp = (kind, value) =>
    log.push(
      `${Math.round(performance.now() - t0)}:${kind}${value === undefined ? "" : `=${value}`}`,
    );
  document.addEventListener("dismissableLayer.update", () => stamp("layer-update"));
  document.addEventListener("focusin", (e) => stamp("focus", e.target.id || e.target.tagName));
  window.addEventListener("keydown", (e) => stamp("keydown", e.key), true);
  let count = -1;
  new MutationObserver(() => {
    const next = document.querySelectorAll('[role="dialog"]').length;
    if (next !== count) stamp("dialogs", next);
    count = next;
  }).observe(document, { subtree: true, childList: true });
}

/** Opens the outer and nested dialogs; returns a bounded `until` that reports state and trace. */
export async function nestedOverlayHarness(page, base) {
  const until = async (fn, label) => {
    try {
      await page.waitForFunction(fn, null, { timeout: 8000 });
    } catch {
      const state = await page.evaluate(() => ({
        dialogs: document.querySelectorAll('[role="dialog"]').length,
        active: document.activeElement?.id || document.activeElement?.tagName,
        trace: (window.__neshelOverlayTrace ?? []).slice(-16).join(" "),
      }));
      throw new Error(`timed out: ${label} (${JSON.stringify(state)})`);
    }
  };
  await page.addInitScript(installOverlayTrace);
  await page.goto(`${base}/index.html`);
  await page.click("#dialog-trigger");
  await until(
    () => document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    "focus in the outer dialog",
  );
  await page.click("#nested-trigger");
  await until(
    () =>
      document
        .querySelector("#nested-close")
        ?.closest('[role="dialog"]')
        ?.contains(document.activeElement),
    "focus in the nested dialog",
  );
  return until;
}

/** Flows keyed by case id: async ({ page, base, check }) => void. */
export const NESTED_OVERLAY_FLOWS = {
  // K-15 (feature 017): Escape is pressed as soon as the nested dialog has focus — no grace delay.
  // Feature 006 shipped a 100 ms wait as a "known limitation"; it was a real defect (Radix moved
  // Escape ownership to the new layer only after a deferred render) and is fixed in the components
  // (internal/layer.tsx, contracts/overlay-escape.md). Failures carry an event trace.
  async "nested-overlays-escape-order"({ page, base, check }) {
    const until = await nestedOverlayHarness(page, base);
    await page.keyboard.press("Escape");
    await until(
      () => document.querySelectorAll('[role="dialog"]').length === 1,
      "only the nested dialog closed",
    );
    await until(
      () => document.activeElement?.id === "nested-trigger",
      "focus back on the nested trigger",
    );
    await page.keyboard.press("Escape");
    await until(
      () => document.querySelectorAll('[role="dialog"]').length === 0,
      "outer dialog closed",
    );
    await until(() => document.activeElement?.id === "dialog-trigger", "focus back on the trigger");
    check(
      await page.evaluate(() => !document.querySelector(".neshel-overlay")),
      "an overlay was left behind",
    );
  },
  // K-15: the second Escape arrives right after the nested dialog unmounts, before Radix has
  // re-attached the outer layer's listener; it must still close the outer dialog.
  async "nested-overlays-rapid-escape"({ page, base }) {
    const until = await nestedOverlayHarness(page, base);
    await page.keyboard.press("Escape");
    await until(
      () => document.querySelectorAll('[role="dialog"]').length === 1,
      "only the nested dialog closed",
    );
    await page.keyboard.press("Escape");
    await until(
      () => document.querySelectorAll('[role="dialog"]').length === 0,
      "second Escape closed the outer dialog",
    );
  },
};
