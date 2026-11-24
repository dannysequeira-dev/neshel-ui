// pnpm check:browsers --consumers <dir> [--engine chromium|firefox|webkit]... [--variant <name>]... [--report <file>]
// Feature 006 (release requirement R3, ADR 0016): smoke flows of the interactive components in
// Chromium, Firefox and WebKit (Playwright engines) against the packed component consumers written
// by `check:consumer --artifacts <dir>`, served over HTTP. Covers Dialog, nested overlays, Select,
// MultiSelect, Combobox, Combobox inside Popover, theme inheritance across portals, mobile
// navigation, the Sidebar (desktop collapse and mobile drawer) and axe-core. Accessibility-tree
// snapshots of key flows are written to the report as evidence for the screen-reader evaluation.
// Playwright WebKit is reported as WebKit, never as Safari. Without installed engines: fails when
// CI=true, otherwise prints SKIPPED.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { COMPONENT_VARIANTS } from "./lib/consumer-components.mjs";
import { NESTED_OVERLAY_FLOWS } from "./lib/overlay-escape.mjs";
import { startStaticServer } from "./lib/static-server.mjs";

const require = createRequire(import.meta.url);
const ENGINES = ["chromium", "firefox", "webkit"];
const OPEN_LIST = '.neshel-select-positioner:not([hidden]) [role="listbox"]';

function argValues(name) {
  return process.argv.flatMap((arg, index) => (process.argv[index - 1] === name ? [arg] : []));
}

const rem = (value) => Math.round(Number.parseFloat(value) * 16);

/** Each flow: async ({ page, base, params, check }) => void. */
const FLOWS = {
  async "dialog-focus-escape"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    await page.click("#dialog-trigger");
    await page.waitForSelector('[role="dialog"]');
    await page.waitForFunction(() =>
      document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    );
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { state: "detached" });
    // Focus restoration happens right after unmount; wait for it (bounded).
    await page
      .waitForFunction(() => document.activeElement?.id === "dialog-trigger", null, {
        timeout: 3000,
      })
      .catch(() => {});
    check(
      (await page.evaluate(() => document.activeElement?.id)) === "dialog-trigger",
      "focus not restored to the trigger",
    );
  },
  ...NESTED_OVERLAY_FLOWS,
  // Feature 017: Accordion keyboard (arrows skip the disabled header, Home/End, Enter/Space toggle).
  async "accordion-keyboard"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    const expanded = (id) => page.getAttribute(id, "aria-expanded");
    check((await expanded("#faq-t1")) === "true", "defaultValue item not open after hydration");
    await page.focus("#faq-t1");
    await page.keyboard.press("ArrowDown");
    check(
      (await page.evaluate(() => document.activeElement?.id)) === "faq-t3",
      "ArrowDown did not skip the disabled header",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelector("#faq-t3")?.getAttribute("aria-expanded") === "true",
    );
    check((await expanded("#faq-t1")) === "false", "single accordion kept two items open");
    await page.keyboard.press(" ");
    await page.waitForFunction(
      () => document.querySelector("#faq-t3")?.getAttribute("aria-expanded") === "false",
    );
    await page.keyboard.press("Home");
    check((await page.evaluate(() => document.activeElement?.id)) === "faq-t1", "Home");
    await page.keyboard.press("End");
    check((await page.evaluate(() => document.activeElement?.id)) === "faq-t3", "End");
    await page.click("#faq-t2", { force: true }).catch(() => {});
    check((await expanded("#faq-t2")) === "false", "the disabled item toggled");
  },
  async "collapsible-toggle"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    check(!(await page.isVisible("#more-content")), "collapsible open before interaction");
    await page.click("#more-trigger");
    await page.waitForSelector("#more-content", { state: "visible" });
    check(
      (await page.getAttribute("#more-trigger", "aria-controls")) ===
        (await page.getAttribute("#more-content", "id")),
      "aria-controls does not point at the panel",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelector("#more-trigger")?.getAttribute("aria-expanded") === "false",
    );
  },
  // Space (real keyboard) and the Label toggle the switch; the form submits name=value only while on;
  // a required switch blocks submission while off.
  async "switch-keyboard-and-form"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    await page.focus("#emails");
    check(
      await page.evaluate(() => document.querySelector("#emails")?.matches(":focus-visible")),
      "no focus-visible on keyboard focus",
    );
    await page.keyboard.press(" ");
    check((await page.getAttribute("#emails", "aria-checked")) === "true", "Space did not toggle");
    await page.click('label[for="emails"]');
    check((await page.getAttribute("#emails", "aria-checked")) === "false", "label did not toggle");
    await page.keyboard.press(" ");
    await page.click("#settings-submit");
    check(
      (await page.textContent("#settings-result")) === "",
      "required switch did not block submit",
    );
    await page.click("#terms");
    await page.click("#settings-submit");
    await page.waitForFunction(() => document.querySelector("#settings-result")?.textContent);
    const entries = JSON.parse((await page.textContent("#settings-result")) || "[]");
    check(
      JSON.stringify(entries) ===
        JSON.stringify([
          ["emails", "on"],
          ["terms", "on"],
        ]),
      `form data ${JSON.stringify(entries)}`,
    );
  },
  // Toast: announced once in the polite region, F8 moves focus to it, the action runs, Escape closes the
  // focused toast and focus returns to where it came from; errors go to the alert region.
  async "toast-announce-hotkey-escape"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    const region = "section.neshel-toaster";
    check(
      (await page.locator(`${region} [role="status"]`).count()) === 1 &&
        (await page.locator(`${region} [role="alert"]`).count()) === 1,
      "live regions missing before the first toast",
    );
    await page.click("#toast-trigger");
    await page.waitForSelector(`${region} .neshel-toast[data-state="open"]`);
    check(
      (await page.textContent(`${region} [role="status"]`))?.includes(
        "Profile saved. Changes stored",
      ),
      "toast not announced",
    );
    await page.waitForTimeout(300);
    check(
      (await page.locator(`${region} [role="status"] p`).count()) === 1,
      "toast announced more than once",
    );
    await page.focus("#toast-error");
    await page.keyboard.press("F8");
    check(
      await page.evaluate(() => document.activeElement?.classList.contains("neshel-toast")),
      "F8 did not focus the toast",
    );
    await page.keyboard.press("Escape");
    await page.waitForSelector(`${region} .neshel-toast`, { state: "detached" });
    check(
      (await page.evaluate(() => document.activeElement?.id)) === "toast-error",
      "focus did not return after Escape",
    );
    await page.click("#toast-trigger");
    await page.click(`${region} .neshel-toast-action`);
    await page.waitForFunction(
      () => document.querySelector("#toast-undo")?.textContent === "undone",
    );
    await page.click("#toast-error");
    await page.waitForFunction(() =>
      document
        .querySelector('section.neshel-toaster [role="alert"]')
        ?.textContent?.includes("Upload failed"),
    );
  },
  async "select-in-dialog-escape-layering"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    await page.click("#dialog-trigger");
    await page.waitForSelector('[role="dialog"]');
    await page.click("#dialog-select");
    await page.waitForSelector(OPEN_LIST);
    await page.keyboard.press("Escape");
    await page
      .waitForSelector(OPEN_LIST, { state: "detached" })
      .catch(() => page.waitForSelector(OPEN_LIST, { state: "hidden" }));
    check(
      (await page.locator('[role="dialog"]').count()) === 1,
      "Escape closed the dialog together with the listbox",
    );
  },
  async "select-keyboard-and-serialisation"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    await page.focus("#country");
    await page.keyboard.press("ArrowDown");
    await page.waitForSelector(OPEN_LIST);
    await page.locator(`${OPEN_LIST} [role="option"]`, { hasText: "Spain" }).click();
    await page.waitForFunction(() =>
      document.querySelector("#country")?.textContent?.includes("Spain"),
    );
    await page.click("#submit");
    await page.waitForFunction(() =>
      document.querySelector("#form-result")?.textContent?.includes('"country","es"'),
    );
    check(true, "");
  },
  async "multiselect-chips"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    await page.click("#languages");
    await page.waitForSelector(OPEN_LIST);
    await page.locator(`${OPEN_LIST} [role="option"]`, { hasText: "Spanish" }).click();
    await page.locator(`${OPEN_LIST} [role="option"]`, { hasText: "Japanese" }).click();
    await page.keyboard.press("Escape");
    const chips = await page.locator(".neshel-multi-select .neshel-chip-label").allTextContents();
    check(
      JSON.stringify(chips) === JSON.stringify(["Spanish", "Japanese"]),
      `chips ${JSON.stringify(chips)}`,
    );
    await page.click('button[aria-label="Remove Spanish"]');
    await page.waitForFunction(
      () => document.querySelectorAll(".neshel-multi-select .neshel-chip-label").length === 1,
    );
  },
  async "combobox-filter-select"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    await page.click("#city");
    await page.keyboard.type("spa");
    await page.waitForFunction(
      (sel) => document.querySelectorAll(`${sel} [role="option"]`).length === 1,
      OPEN_LIST,
    );
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#city")?.value === "Spain");
    check((await page.getAttribute("#city", "aria-expanded")) === "false", "popup still open");
  },
  async "combobox-in-popover"({ page, base, check }) {
    await page.goto(`${base}/index.html`);
    await page.click("#pc-trigger");
    await page.waitForSelector("#pc-content");
    await page.click("#pc-combobox");
    await page.keyboard.type("ja");
    await page.waitForSelector(OPEN_LIST);
    check(
      await page.evaluate(
        (sel) => !!document.querySelector("#pc-content")?.contains(document.querySelector(sel)),
        OPEN_LIST,
      ),
      "listbox not inside the popover",
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => document.querySelector("#pc-combobox")?.getAttribute("aria-expanded") !== "true",
    );
    check((await page.locator("#pc-content").count()) === 1, "first Escape closed the popover");
    await page.keyboard.press("Escape");
    await page.waitForSelector("#pc-content", { state: "detached" });
  },
  async "selection-popups-named-and-axe-clean"({ page, base, check, axeSource }) {
    await page.goto(`${base}/index.html`);
    for (const [control, open] of [
      ["#country", async () => page.click("#country")],
      ["#languages", async () => page.click("#languages")],
      [
        "#city",
        async () => {
          await page.click("#city");
          await page.keyboard.type("a");
        },
      ],
    ]) {
      await open();
      await page.waitForSelector(OPEN_LIST);
      const result = await page.evaluate(
        ({ sel, control: id }) => {
          const list = document.querySelector(sel);
          const label = document.querySelector(`label[for="${id.slice(1)}"]`);
          const text = label
            ? [...label.childNodes]
                .filter((n) => !(n instanceof Element && n.getAttribute("aria-hidden") === "true"))
                .map((n) => n.textContent)
                .join("")
                .trim()
            : null;
          return {
            name: list?.getAttribute("aria-label") ?? list?.getAttribute("aria-labelledby"),
            label: text,
          };
        },
        { sel: OPEN_LIST, control },
      );
      check(
        result.name && result.name === result.label,
        `${control} listbox name ${JSON.stringify(result)}`,
      );
      // Contrast is only meaningful once the opening transition has finished (opacity < 1 before).
      await page.waitForFunction((sel) => {
        const positioner = document.querySelector(sel)?.closest(".neshel-select-positioner");
        return (
          !!positioner &&
          positioner.getAnimations({ subtree: true }).every((a) => a.playState !== "running") &&
          !positioner.querySelector("[data-starting-style]")
        );
      }, OPEN_LIST);
      await page.waitForTimeout(50);
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async (sel) => {
        const res = await window.axe.run(document.querySelector(sel), {
          resultTypes: ["violations"],
        });
        return res.violations.map((v) => v.id);
      }, OPEN_LIST);
      check(violations.length === 0, `${control} open listbox axe: ${violations.join(", ")}`);
      await page.keyboard.press("Escape");
      // Wait until this popup is really gone, so the next control's listbox is not confused with it.
      await page.waitForFunction((sel) => !document.querySelector(sel), OPEN_LIST);
    }
  },
  async "theme-inheritance-across-portals"({ page, base, params, check }) {
    await page.goto(`${base}/index.html`);
    await page.click("#theme-dialog-trigger");
    await page.waitForSelector('[role="dialog"]');
    const theme = await page.evaluate(() =>
      document
        .querySelector('[role="dialog"]')
        ?.closest("[data-neshel-portal]")
        ?.getAttribute("data-neshel-theme"),
    );
    check(theme === params.theme, `portal theme ${theme}, expected ${params.theme}`);
    const inBoundary = await page.evaluate(
      () => !!document.querySelector('[role="dialog"]')?.closest("#theme-boundary"),
    );
    check(!inBoundary, "dialog rendered inside the theme boundary (no portal)");
  },
  async "mobile-navigation"({ page, base, params, check }) {
    await page.setViewportSize({ width: rem(params.shellWidth) - 80, height: 800 });
    await page.goto(`${base}/index.html`);
    check(await page.isVisible("#mobile-trigger"), "mobile trigger hidden below the breakpoint");
    check(!(await page.isVisible("#navbar-nav")), "desktop links visible below the breakpoint");
    await page.click("#mobile-trigger");
    await page.waitForSelector('[role="dialog"]');
    await page.click("#mobile-docs");
    await page.waitForSelector('[role="dialog"]', { state: "detached" });
    await page.setViewportSize({ width: rem(params.shellWidth) + 80, height: 800 });
    await page.waitForFunction(
      () =>
        !document.querySelector("#mobile-trigger")?.checkVisibility?.() ||
        getComputedStyle(document.querySelector("#mobile-trigger")).display === "none",
    );
    check(await page.isVisible("#navbar-nav"), "desktop links hidden at the breakpoint");
  },
  async "sidebar-desktop-and-drawer"({ page, base, params, check }) {
    await page.setViewportSize({ width: rem(params.shellWidth) + 120, height: 800 });
    await page.goto(`${base}/shell.html`);
    await page.waitForFunction(
      () => document.querySelector("#sidebar-trigger")?.getAttribute("data-mode") === "desktop",
    );
    await page.click("#sidebar-trigger");
    await page.waitForFunction(() =>
      document.querySelector(".neshel-sidebar")?.hasAttribute("data-collapsed"),
    );
    await page.setViewportSize({ width: rem(params.shellWidth) - 120, height: 800 });
    await page.waitForFunction(
      () => document.querySelector("#sidebar-trigger")?.getAttribute("data-mode") === "mobile",
    );
    await page.click("#sidebar-trigger");
    await page.waitForSelector('[role="dialog"]');
    check(
      await page.isVisible('[role="dialog"] #side-dashboard'),
      "sidebar content not in the drawer",
    );
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { state: "detached" });
  },
};

async function axeViolations(page, axeSource) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, { resultTypes: ["violations"] });
    return result.violations.map((v) => `${v.id} (${v.nodes.length})`);
  });
}

async function main() {
  const consumers = argValues("--consumers")[0];
  if (!consumers)
    throw new Error("--consumers <dir> is required (written by check:consumer --artifacts)");
  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    if (process.env.CI === "true") throw new Error("playwright is not installed");
    console.info("check:browsers SKIPPED (playwright not installed)");
    return;
  }
  const engines = argValues("--engine").length ? argValues("--engine") : ENGINES;
  const variants = (
    argValues("--variant").length ? argValues("--variant") : Object.keys(COMPONENT_VARIANTS)
  ).filter((name) => existsSync(join(resolve(consumers), name, "index.html")));
  if (variants.length === 0) throw new Error(`no component consumer builds found in ${consumers}`);
  const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  const report = { engines: {}, accessibilityTree: {} };
  const failures = [];
  let passed = 0;
  let total = 0;
  for (const engineName of engines) {
    let browser;
    try {
      browser = await playwright[engineName].launch();
    } catch (error) {
      const message = `${engineName}: cannot launch (${error.message.split("\n")[0]}) — run pnpm exec playwright install ${engineName}`;
      if (process.env.CI === "true") {
        failures.push(message);
        continue;
      }
      console.info(`SKIPPED ${message}`);
      continue;
    }
    const version = browser.version();
    report.engines[engineName] = { version, variants: {} };
    console.info(
      `\n${engineName} ${version}${engineName === "webkit" ? " (Playwright WebKit, not Safari)" : ""}`,
    );
    for (const variant of variants) {
      const server = await startStaticServer(join(resolve(consumers), variant));
      const params = COMPONENT_VARIANTS[variant];
      const cases = [];
      for (const [id, flow] of Object.entries(FLOWS)) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await flow({
            page,
            base: server.origin,
            params,
            axeSource,
            check: (condition, message) => {
              if (!condition) throw new Error(message);
            },
          });
          if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
          cases.push({ id, ok: true });
        } catch (error) {
          cases.push({ id, ok: false, error: error.message.split("\n")[0] });
          failures.push(`${engineName} ${variant} ${id}: ${error.message.split("\n")[0]}`);
        } finally {
          await context.close();
        }
      }
      // axe in light and dark, and accessibility-tree evidence (first variant only).
      for (const scheme of ["light", "dark"]) {
        const context = await browser.newContext({ colorScheme: scheme });
        const page = await context.newPage();
        try {
          await page.goto(`${server.origin}/index.html`);
          await page.waitForSelector("#submit");
          const violations = await axeViolations(page, axeSource);
          const ok = violations.length === 0;
          cases.push(
            ok
              ? { id: `axe-${scheme}`, ok }
              : { id: `axe-${scheme}`, ok, error: violations.join(", ") },
          );
          if (!ok)
            failures.push(`${engineName} ${variant} axe-${scheme}: ${violations.join(", ")}`);
          if (scheme === "light" && variant === variants[0]) {
            await page.click("#dialog-trigger");
            await page.waitForSelector('[role="dialog"]');
            const dialog = await page.locator('[role="dialog"]').ariaSnapshot();
            await page.keyboard.press("Escape");
            await page.click("#languages");
            await page.waitForSelector(OPEN_LIST);
            const listbox = await page.locator(OPEN_LIST).ariaSnapshot();
            report.accessibilityTree[engineName] = { dialog, multiSelectListbox: listbox };
          }
        } finally {
          await context.close();
        }
      }
      await server.close();
      const ok = cases.filter((c) => c.ok).length;
      passed += ok;
      total += cases.length;
      report.engines[engineName].variants[variant] = cases;
      console.info(`  ${ok === cases.length ? "ok  " : "FAIL"} ${variant} — ${ok}/${cases.length}`);
      for (const c of cases.filter((x) => !x.ok)) console.error(`    ✗ ${c.id}: ${c.error}`);
    }
    await browser.close();
  }
  const reportPath = argValues("--report")[0];
  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (failures.length) {
    for (const failure of failures) {
      if (process.env.GITHUB_ACTIONS === "true")
        console.log(`::error title=check:browsers::${failure}`);
    }
    console.error(
      `check:browsers failed: ${failures.length} problem(s); ${passed}/${total} cases passed.`,
    );
    process.exitCode = 1;
  } else
    console.info(
      `check:browsers passed: ${passed} cases (${Object.keys(report.engines).join(", ")}).`,
    );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
