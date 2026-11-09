// Feature 005 browser interaction suite (FR-121, FR-122; brief §31–§32). Runs against the packed
// consumer builds written by `check:consumer --artifacts`. Input uses trusted CDP events
// (Input.dispatchMouseEvent / dispatchKeyEvent / insertText), so focus management, keyboard
// handling and pointer dismissal run exactly as for a user. Chrome only (research R19).

const KEYS = {
  Enter: { code: "Enter", keyCode: 13, text: "\r" },
  Escape: { code: "Escape", keyCode: 27 },
  Tab: { code: "Tab", keyCode: 9 },
  ArrowDown: { code: "ArrowDown", keyCode: 40 },
  ArrowUp: { code: "ArrowUp", keyCode: 38 },
  Home: { code: "Home", keyCode: 36 },
  " ": { code: "Space", keyCode: 32, text: " " },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (value) => JSON.stringify(value);

/** Page helpers over the CDP page object from cdp.mjs. */
export function driver(page) {
  const evaluate = (expression) => page.evaluate(expression);
  const api = {
    evaluate,
    async waitFor(expression, label, timeout = 4000) {
      const start = Date.now();
      let value;
      while (Date.now() - start < timeout) {
        value = await evaluate(`!!(${expression})`);
        if (value) return value;
        await sleep(40);
      }
      throw new Error(`timed out waiting for ${label}`);
    },
    async settle(ms = 260) {
      await sleep(ms);
    },
    async press(key, modifiers = 0) {
      const info = KEYS[key] ?? {
        code: `Key${key.toUpperCase()}`,
        keyCode: key.toUpperCase().charCodeAt(0),
        text: key,
      };
      const base = { key, code: info.code, windowsVirtualKeyCode: info.keyCode, modifiers };
      await page.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        ...base,
        ...(info.text ? { text: info.text } : {}),
      });
      await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
      await sleep(60);
    },
    async type(text) {
      await page.send("Input.insertText", { text });
      await sleep(80);
    },
    async point(selector) {
      const box = await evaluate(`(() => {
        const el = document.querySelector(${json(selector)});
        if (!el) return null;
        el.scrollIntoView({ block: "center", inline: "center" });
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      if (!box) throw new Error(`no element ${selector}`);
      return box;
    },
    async clickAt(x, y) {
      await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await page.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await page.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x,
        y,
        button: "left",
        clickCount: 1,
      });
      await sleep(80);
    },
    async click(selector) {
      const { x, y } = await api.point(selector);
      await api.clickAt(x, y);
    },
    /** Click the option with this text in the open selection popup. */
    async clickOption(text) {
      // Wait until the popup's opening transition has finished, so the option does not move
      // under the pointer between measuring and clicking.
      await api.waitFor(
        `(() => { const p = document.querySelector('.neshel-select-positioner:not([hidden]) [role="listbox"]'); return p && p.getAnimations().length === 0 && !p.hasAttribute("data-starting-style"); })()`,
        "stable popup",
      );
      await sleep(120);
      const box = await evaluate(`(() => {
        const option = [...document.querySelectorAll('.neshel-select-positioner:not([hidden]) [role="option"]')].find((o) => o.textContent.trim() === ${json(text)});
        if (!option) return null;
        option.scrollIntoView({ block: "nearest" });
        const r = option.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      if (!box) throw new Error(`no open option "${text}"`);
      await api.clickAt(box.x, box.y);
    },
    async hover(selector) {
      const { x, y } = await api.point(selector);
      await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await sleep(80);
    },
    active: () =>
      evaluate(
        `(() => { const a = document.activeElement; return a ? (a.id || a.getAttribute("aria-label") || a.textContent?.trim().slice(0, 40) || a.tagName) : null; })()`,
      ),
    count: (selector) => evaluate(`document.querySelectorAll(${json(selector)}).length`),
    text: (selector) =>
      evaluate(`document.querySelector(${json(selector)})?.textContent?.trim() ?? null`),
    style: (selector, property) =>
      evaluate(
        `(() => { const el = document.querySelector(${json(selector)}); return el ? getComputedStyle(el).getPropertyValue(${json(property)}).trim() : null; })()`,
      ),
    async viewport(width, height = 900) {
      await page.setViewport(width, height);
      await sleep(150);
    },
    async reload(url) {
      await page.goto(url);
      await api.waitFor(`document.documentElement.dataset.mounted === "true"`, "React mount", 8000);
      await sleep(120);
    },
  };
  return api;
}

/** The open selection popup (Base UI keeps closed popups mounted but hidden). */
const OPEN_LIST = '.neshel-select-positioner:not([hidden]) [role="listbox"]';
const LIST = `document.querySelector(${JSON.stringify(OPEN_LIST)})`;
const OPTIONS = `document.querySelectorAll(${JSON.stringify(`${OPEN_LIST} [role="option"]`)})`;

const rem = (value) => Math.round(Number.parseFloat(value) * 16);

/** Runs every interaction case; returns { failures, passed, cases }. */
export async function runComponentSuite(page, { name, labUrl, shellUrl, params, axeSource }) {
  const d = driver(page);
  const failures = [];
  const cases = [];
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  async function run(id, body, fresh) {
    try {
      if (fresh) {
        // Each case starts from a fresh page so one failure cannot cascade into the next.
        await d.viewport(1280);
        await d.reload(fresh);
      }
      await body();
      cases.push({ id, ok: true });
    } catch (error) {
      cases.push({ id, ok: false, error: error.message });
      failures.push(`${name} ${id}: ${error.message}`);
    }
  }
  const shellPx = rem(params.shellWidth);
  const buttonPx = rem(params.buttonWidth);
  const dialogOpen = `document.querySelector('[role="dialog"]')`;

  await d.viewport(1280);
  await page.emulateColorScheme("light");

  // --- SSR / hydration -------------------------------------------------------------------------
  for (const [id, url] of [
    ["hydration-lab", labUrl],
    ["hydration-shell", shellUrl],
  ]) {
    await run(id, async () => {
      page.errors.length = 0;
      await d.reload(url);
      const state = await d.evaluate(`({ ...document.documentElement.dataset })`);
      check(state.hydrated === "true", "page was not hydrated from SSR markup");
      check(!state.hydrationErrors, `hydration errors: ${state.hydrationErrors}`);
      check(page.errors.length === 0, `console errors: ${page.errors.join(" | ")}`);
    });
  }

  await d.reload(labUrl);

  // --- Foundation computed styles --------------------------------------------------------------
  await run(
    "button-tokens-and-focus",
    async () => {
      const primary = await d.evaluate(`(() => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--neshel-primary)";
      document.body.append(probe);
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    })()`);
      check(
        (await d.style("#btn-primary", "background-color")) === primary,
        "primary button does not use --neshel-primary",
      );
      check(
        (await d.evaluate(`document.querySelector("#btn-primary").type`)) === "button",
        "default type is not button",
      );
      await d.evaluate(`document.body.focus()`);
      await d.click("#btn-primary");
      await d.evaluate(`document.querySelector("#btn-primary").blur()`);
      // Keyboard focus shows the focus ring.
      await d.evaluate(`document.querySelector("#btn-responsive").focus()`);
      await d.press("Tab");
      await d.press("Tab", 8); // Shift+Tab back
      const outline = await d.evaluate(
        `(() => { const a = document.activeElement; const s = getComputedStyle(a); return a.matches(":focus-visible") ? s.outlineStyle + " " + s.outlineWidth : "no focus-visible"; })()`,
      );
      check(/^solid [1-9]/.test(outline), `focus-visible outline missing (${outline})`);
      const loading = await d.evaluate(
        `(() => { const b = document.querySelector("#btn-loading"); return [b.getAttribute("aria-disabled"), b.disabled, b.textContent.trim()]; })()`,
      );
      check(
        loading[0] === "true" && loading[1] === false && loading[2] === "Saving",
        `loading button state ${json(loading)}`,
      );
    },
    labUrl,
  );

  await run(
    "button-responsive-size",
    async () => {
      await d.viewport(buttonPx - 1);
      const below = await d.evaluate(
        `document.querySelector("#btn-responsive").getBoundingClientRect().height`,
      );
      await d.viewport(buttonPx);
      const at = await d.evaluate(
        `document.querySelector("#btn-responsive").getBoundingClientRect().height`,
      );
      await d.viewport(1280);
      check(
        Math.round(below) === 32 && Math.round(at) === 48,
        `button heights ${below} (${buttonPx - 1}px) / ${at} (${buttonPx}px), expected 32 / 48`,
      );
    },
    labUrl,
  );

  // --- Dialog ------------------------------------------------------------------------------------
  await run(
    "dialog-focus-trap-escape-restore",
    async () => {
      await d.click("#dialog-trigger");
      await d.waitFor(dialogOpen, "dialog");
      await d.waitFor(
        `document.querySelector('[role="dialog"]').contains(document.activeElement)`,
        "focus inside dialog",
      );
      for (let i = 0; i < 8; i++) {
        await d.press("Tab");
        check(
          await d.evaluate(
            `document.querySelector('[role="dialog"]').contains(document.activeElement)`,
          ),
          `focus escaped the dialog after ${i + 1} Tab`,
        );
      }
      check(
        await d.evaluate(
          `getComputedStyle(document.body).overflow === "hidden" || document.body.hasAttribute("data-scroll-locked")`,
        ),
        "page scroll not locked",
      );
      await d.press("Escape");
      await d.waitFor(`!${dialogOpen}`, "dialog closed");
      check((await d.active()) === "dialog-trigger", `focus returned to ${await d.active()}`);
    },
    labUrl,
  );

  await run(
    "select-inside-dialog-layering",
    async () => {
      await d.click("#dialog-trigger");
      await d.waitFor(dialogOpen, "dialog");
      await d.click("#dialog-select");
      await d.waitFor(LIST, "listbox");
      check(
        await d.evaluate(`!!${LIST}.closest('[role="dialog"]')`),
        "select popup is not inside the dialog",
      );
      await d.clickOption("Spain");
      await d.waitFor(`!${LIST}`, "listbox closed after choice");
      check(
        (await d.text("#dialog-select")).includes("Spain"),
        `select shows ${await d.text("#dialog-select")}`,
      );
      check(await d.evaluate(`!!${dialogOpen}`), "choosing an option closed the dialog");
      await d.click("#dialog-select");
      await d.waitFor(LIST, "listbox again");
      await d.press("Escape");
      await d.waitFor(`!${LIST}`, "Escape closed the listbox");
      await d.settle();
      check(await d.evaluate(`!!${dialogOpen}`), "Escape in the select also closed the dialog");
      await d.press("Escape");
      await d.waitFor(`!${dialogOpen}`, "second Escape closes the dialog");
    },
    labUrl,
  );

  await run(
    "nested-dialog",
    async () => {
      await d.click("#dialog-trigger");
      await d.waitFor(dialogOpen, "dialog");
      await d.click("#nested-trigger");
      await d.waitFor(`document.querySelectorAll('[role="dialog"]').length === 2`, "nested dialog");
      await d.press("Escape");
      await d.waitFor(
        `document.querySelectorAll('[role="dialog"]').length === 1`,
        "only nested closed",
      );
      check((await d.active()) === "nested-trigger", `focus returned to ${await d.active()}`);
      await d.press("Escape");
      await d.waitFor(`!${dialogOpen}`, "outer closed");
    },
    labUrl,
  );

  await run(
    "alert-dialog",
    async () => {
      await d.click("#alert-trigger");
      await d.waitFor(`document.querySelector('[role="alertdialog"]')`, "alertdialog");
      await d.waitFor(`document.activeElement?.id === "alert-cancel"`, "initial focus on Cancel");
      await d.clickAt(5, 5);
      await d.settle();
      check(
        await d.evaluate(`!!document.querySelector('[role="alertdialog"]')`),
        "outside press dismissed the alert dialog",
      );
      await d.press("Escape");
      await d.waitFor(`!document.querySelector('[role="alertdialog"]')`, "Escape cancels");
      check((await d.text("#alert-result")) === "none", "Escape ran an action");
      await d.click("#alert-trigger");
      await d.waitFor(`document.querySelector('[role="alertdialog"]')`, "alertdialog again");
      await d.click("#alert-action");
      await d.waitFor(`!document.querySelector('[role="alertdialog"]')`, "action closes");
      check((await d.text("#alert-result")) === "deleted", "action handler did not run");
    },
    labUrl,
  );

  await run(
    "popover",
    async () => {
      await d.click("#popover-trigger");
      await d.waitFor(`document.querySelector("#popover-content")`, "popover");
      check(
        (await d.evaluate(
          `document.querySelector("#popover-trigger").getAttribute("aria-expanded")`,
        )) === "true",
        "trigger not expanded",
      );
      await d.press("Escape");
      await d.waitFor(`!document.querySelector("#popover-content")`, "Escape closes");
      check((await d.active()) === "popover-trigger", "focus not restored to the trigger");
      await d.click("#popover-trigger");
      await d.waitFor(`document.querySelector("#popover-content")`, "popover again");
      await d.clickAt(5, 5);
      await d.waitFor(`!document.querySelector("#popover-content")`, "outside press closes");
    },
    labUrl,
  );

  await run(
    "sheet",
    async () => {
      await d.click("#sheet-trigger");
      await d.waitFor(dialogOpen, "sheet");
      await d.settle(320);
      const box = await d.evaluate(
        `(() => { const r = document.querySelector('[role="dialog"]').getBoundingClientRect(); return { right: Math.round(window.innerWidth - r.right), top: Math.round(r.top) }; })()`,
      );
      check(box.right === 0 && box.top === 0, `sheet not attached to the right edge ${json(box)}`);
      await d.press("Escape");
      await d.waitFor(`!${dialogOpen}`, "sheet closed");
      check((await d.active()) === "sheet-trigger", "focus not restored");
    },
    labUrl,
  );

  await run(
    "dropdown-menu-keyboard",
    async () => {
      await d.evaluate(`document.querySelector("#menu-trigger").focus()`);
      await d.press("Enter");
      await d.waitFor(`document.querySelector('[role="menu"]')`, "menu");
      await d.waitFor(
        `document.activeElement?.getAttribute("role") === "menuitem"`,
        "first item focused",
      );
      check((await d.active()) === "Profile", `first focused item ${await d.active()}`);
      await d.press("ArrowDown");
      check((await d.active()) === "Settings", `after ArrowDown ${await d.active()}`);
      await d.press("Enter");
      await d.waitFor(`!document.querySelector('[role="menu"]')`, "menu closed");
      check((await d.text("#menu-result")) === "settings", "item handler did not run");
      check((await d.active()) === "menu-trigger", "focus not restored to the trigger");
    },
    labUrl,
  );

  await run(
    "navigation-menu",
    async () => {
      await d.evaluate(`document.querySelector("#nav-trigger").focus()`);
      await d.press("Enter");
      await d.waitFor(`document.querySelector("#nav-link-a")`, "panel");
      check(
        (await d.evaluate(
          `document.querySelector("#nav-trigger").getAttribute("aria-expanded")`,
        )) === "true",
        "trigger not expanded",
      );
      check(
        (await d.evaluate(
          `document.querySelector('a[href="#pricing"]').getAttribute("aria-current")`,
        )) === "page",
        "active link lacks aria-current",
      );
      await d.press("Escape");
      await d.waitFor(`!document.querySelector("#nav-link-a")`, "panel closed");
    },
    labUrl,
  );

  // --- Selection -------------------------------------------------------------------------------
  await run(
    "select-keyboard-typeahead",
    async () => {
      await d.evaluate(`document.querySelector("#country").focus()`);
      await d.press("ArrowDown");
      await d.waitFor(LIST, "listbox");
      await d.press("j");
      await d.settle(150);
      await d.press("Enter");
      await d.waitFor(`!${LIST}`, "closed");
      check(
        (await d.text("#country")).includes("Japan"),
        `typeahead chose ${await d.text("#country")}`,
      );
      check((await d.active()) === "country", "focus not back on the trigger");
    },
    labUrl,
  );

  await run(
    "multiselect-select-and-remove",
    async () => {
      await d.click("#languages");
      await d.waitFor(LIST, "listbox");
      check(
        (await d.evaluate(`${LIST}.getAttribute("aria-multiselectable")`)) === "true",
        "listbox is not multiselectable",
      );
      await d.clickOption("Spanish");
      await d.settle(120);
      check(await d.evaluate(`!!${LIST}`), "listbox closed after the first choice");
      await d.clickOption("Japanese");
      await d.press("Escape");
      await d.waitFor(`!${LIST}`, "closed");
      const chips = await d.evaluate(
        `[...document.querySelectorAll(".neshel-multi-select .neshel-chip-label")].map((c) => c.textContent)`,
      );
      check(json(chips) === json(["Spanish", "Japanese"]), `chips ${json(chips)}`);
      await d.click('button[aria-label="Remove Spanish"]');
      await d.settle(120);
      const after = await d.evaluate(
        `[...document.querySelectorAll(".neshel-multi-select .neshel-chip-label")].map((c) => c.textContent)`,
      );
      check(json(after) === json(["Japanese"]), `after removal ${json(after)}`);
      check(
        (await d.text('.neshel-multi-select [role="status"]')) === "Spanish removed",
        "removal not announced",
      );
      check((await d.active()) === "Remove Japanese", `focus after removal ${await d.active()}`);
    },
    labUrl,
  );

  await run(
    "combobox-single-filter",
    async () => {
      await d.click("#city");
      await d.type("spa");
      await d.waitFor(`${OPTIONS}.length === 1`, "filtered to one option");
      await d.press("ArrowDown");
      await d.press("Enter");
      await d.settle(150);
      check(
        (await d.evaluate(`document.querySelector("#city").value`)) === "Spain",
        `input value ${await d.evaluate(`document.querySelector("#city").value`)}`,
      );
      check(
        (await d.evaluate(`document.querySelector("#city").getAttribute("aria-expanded")`)) ===
          "false",
        "popup still open",
      );
    },
    labUrl,
  );

  await run(
    "combobox-multiple-chips-empty",
    async () => {
      await d.click("#tech");
      await d.type("type");
      await d.waitFor(`${OPTIONS}.length === 1`, "TypeScript only");
      await d.press("ArrowDown");
      await d.press("Enter");
      await d.settle(120);
      await d.evaluate(`(() => { const i = document.querySelector("#tech"); i.select(); })()`);
      await d.type("rus");
      await d.waitFor(`${OPTIONS}.length === 1`, "Rust only");
      await d.press("ArrowDown");
      await d.press("Enter");
      await d.settle(120);
      const chips = await d.evaluate(
        `[...document.querySelectorAll(".neshel-combobox .neshel-chip-label")].map((c) => c.textContent)`,
      );
      check(json(chips) === json(["TypeScript", "Rust"]), `chips ${json(chips)}`);
      await d.evaluate(`document.querySelector("#tech").select()`);
      await d.type("zzz");
      await d.waitFor(
        `[...document.querySelectorAll(".neshel-select-empty")].some((e) => e.textContent.includes("No results"))`,
        "empty state",
      );
      await d.press("Escape");
      await d.settle();
      await d.press("Escape"); // popup closed: must not clear the selection
      await d.settle();
      const kept = await d.evaluate(
        `document.querySelectorAll(".neshel-combobox .neshel-chip").length`,
      );
      check(kept === 2, `Escape with a closed popup cleared the selection (${kept} chips left)`);
    },
    labUrl,
  );

  await run(
    "form-serialisation",
    async () => {
      await d.evaluate(`document.querySelector("#country").focus()`);
      await d.press("ArrowDown");
      await d.waitFor(LIST, "country listbox");
      await d.press("j");
      await d.settle(150);
      await d.press("Enter");
      await d.waitFor(`!${LIST}`, "country closed");
      await d.click("#languages");
      await d.waitFor(LIST, "languages listbox");
      await d.clickOption("Japanese");
      await d.press("Escape");
      await d.waitFor(`!${LIST}`, "languages closed");
      await d.click("#city");
      await d.type("spa");
      await d.waitFor(`${OPTIONS}.length === 1`, "city filtered");
      await d.press("ArrowDown");
      await d.press("Enter");
      await d.settle(120);
      for (const query of ["type", "rus"]) {
        await d.click("#tech");
        await d.evaluate(`document.querySelector("#tech").select()`);
        await d.type(query);
        await d.waitFor(`${OPTIONS}.length === 1`, `tech filtered by ${query}`);
        await d.press("ArrowDown");
        await d.press("Enter");
        await d.settle(120);
      }
      await d.press("Escape");
      await d.click("#submit");
      const entries = JSON.parse((await d.text("#form-result")) || "[]");
      const map = {};
      for (const [key, value] of entries) {
        map[key] ??= [];
        map[key].push(value);
      }
      check(json(map.name) === json(["Ruth"]), `name ${json(map.name)}`);
      check(json(map.country) === json(["jp"]), `country ${json(map.country)}`);
      check(json(map.languages) === json(["ja"]), `languages ${json(map.languages)}`);
      check(json(map.city) === json(["es"]), `city ${json(map.city)}`);
      check(json((map.tech ?? []).sort()) === json(["rs", "ts"]), `tech ${json(map.tech)}`);
    },
    labUrl,
  );

  // --- Nested theme through portals (SC-005) -----------------------------------------------------
  await run(
    "theme-through-portals",
    async () => {
      const boundary = await d.evaluate(
        `(() => { const s = getComputedStyle(document.querySelector("#theme-boundary")); return [s.getPropertyValue("--neshel-surface").trim(), s.getPropertyValue("--neshel-background").trim()]; })()`,
      );
      const root = await d.evaluate(
        `getComputedStyle(document.documentElement).getPropertyValue("--neshel-surface").trim()`,
      );
      check(boundary[0] !== root, "test is vacuous: boundary and root share --neshel-surface");
      await d.click("#theme-dialog-trigger");
      await d.waitFor(dialogOpen, "themed dialog");
      const dialogSurface = await d.evaluate(
        `getComputedStyle(document.querySelector('[role="dialog"]')).getPropertyValue("--neshel-surface").trim()`,
      );
      const dialogBg = await d.evaluate(
        `(() => { const p = document.createElement("div"); p.style.backgroundColor = "var(--neshel-surface)"; document.querySelector('[role="dialog"]').append(p); const v = getComputedStyle(p).backgroundColor; p.remove(); return [v, getComputedStyle(document.querySelector('[role="dialog"]')).backgroundColor]; })()`,
      );
      check(
        dialogSurface === boundary[0],
        `dialog --neshel-surface ${dialogSurface}, boundary ${boundary[0]}`,
      );
      check(
        dialogBg[0] === dialogBg[1],
        `dialog background ${dialogBg[1]} does not use the themed surface ${dialogBg[0]}`,
      );
      await d.click("#theme-select");
      await d.waitFor(LIST, "themed listbox");
      const listSurface = await d.evaluate(
        `getComputedStyle(${LIST}).getPropertyValue("--neshel-surface").trim()`,
      );
      check(listSurface === boundary[0], `listbox --neshel-surface ${listSurface}`);
      await d.press("Escape");
      await d.settle();
      await d.press("Escape");
      await d.waitFor(`!${dialogOpen}`, "closed");
      await d.click("#theme-popover-trigger");
      await d.waitFor(`document.querySelector(".neshel-popover-content")`, "themed popover");
      const popSurface = await d.evaluate(
        `getComputedStyle(document.querySelector(".neshel-popover-content")).getPropertyValue("--neshel-surface").trim()`,
      );
      check(popSurface === boundary[0], `popover --neshel-surface ${popSurface}`);
      await d.press("Escape");
      await d.settle();
    },
    labUrl,
  );

  // --- Mobile menu and navbar (lab page) -------------------------------------------------------
  await run(
    "mobile-menu-breakpoint-and-navigation",
    async () => {
      await d.viewport(shellPx - 1);
      check(
        (await d.style("#mobile-trigger", "display")) !== "none",
        "mobile trigger hidden below the breakpoint",
      );
      check(
        (await d.style("#navbar-nav", "display")) === "none",
        "desktop nav visible below the breakpoint",
      );
      await d.click("#mobile-trigger");
      await d.waitFor(dialogOpen, "mobile menu");
      await d.click("#mobile-docs");
      await d.waitFor(`!${dialogOpen}`, "closed after navigation");
      await d.click("#mobile-trigger");
      await d.waitFor(dialogOpen, "reopened");
      await d.viewport(shellPx);
      await d.waitFor(`!${dialogOpen}`, "closed when the viewport reached the breakpoint");
      check(
        (await d.style("#mobile-trigger", "display")) === "none",
        "mobile trigger visible at the breakpoint",
      );
      check(
        (await d.style("#navbar-nav", "display")) !== "none",
        "desktop nav hidden at the breakpoint",
      );
      await d.viewport(1280);
    },
    labUrl,
  );

  await run(
    "reduced-motion",
    async () => {
      await page.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
      await d.click("#dialog-trigger");
      await d.waitFor(dialogOpen, "dialog");
      const animation = await d.evaluate(
        `getComputedStyle(document.querySelector('[role="dialog"]')).animationName`,
      );
      const skeleton = await d.evaluate(
        `getComputedStyle(document.querySelector(".neshel-skeleton")).animationName`,
      );
      await d.press("Escape");
      await d.waitFor(`!${dialogOpen}`, "closed");
      await page.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
      check(
        animation === "none" && skeleton === "none",
        `animations under reduced motion: dialog ${animation}, skeleton ${skeleton}`,
      );
    },
    labUrl,
  );

  // --- Application shell -----------------------------------------------------------------------
  await d.viewport(1280);
  await d.reload(shellUrl);

  await run(
    "shell-desktop-rail",
    async () => {
      await d.viewport(Math.max(shellPx, 1100));
      await d.waitFor(
        `document.querySelector("#shell").dataset.mode === "desktop"`,
        "desktop mode",
      );
      check((await d.style("aside", "display")) === "flex", "sidebar not visible on desktop");
      const width = await d.evaluate(
        `Math.round(document.querySelector("aside").getBoundingClientRect().width)`,
      );
      check(width === 256, `expanded width ${width}`);
      check(
        (await d.evaluate(
          `document.querySelector("#sidebar-trigger").getAttribute("aria-expanded")`,
        )) === "true",
        "trigger not expanded",
      );
      await d.click("#sidebar-trigger");
      await d.waitFor(
        `document.querySelector("aside").hasAttribute("data-collapsed")`,
        "collapsed",
      );
      await d.settle(320);
      const rail = await d.evaluate(
        `Math.round(document.querySelector("aside").getBoundingClientRect().width)`,
      );
      check(rail === 56, `rail width ${rail}`);
      check(
        (await d.evaluate(
          `document.querySelector("#sidebar-trigger").getAttribute("aria-expanded")`,
        )) === "false",
        "aria-expanded not updated",
      );
      const name = await d.evaluate(`document.querySelector("#side-dashboard").textContent.trim()`);
      const clipped = await d.evaluate(
        `getComputedStyle(document.querySelector("#side-dashboard .neshel-sidebar-item-label")).clipPath`,
      );
      check(name === "Dashboard" && clipped.includes("inset"), `rail label ${name} / ${clipped}`);
      const mainLeft = await d.evaluate(
        `Math.round(document.querySelector("#shell-main").getBoundingClientRect().left)`,
      );
      check(mainLeft >= 56, `content overlaps the rail (${mainLeft})`);
      await d.evaluate(`document.querySelector("#side-dashboard").focus()`);
      await d.waitFor(
        `[...document.querySelectorAll('[role="tooltip"]')].some((t) => t.textContent.includes("Dashboard"))`,
        "rail tooltip on focus",
        3000,
      );
      await d.click("#sidebar-trigger");
      await d.waitFor(
        `!document.querySelector("aside").hasAttribute("data-collapsed")`,
        "expanded again",
      );
    },
    shellUrl,
  );

  await run(
    "shell-boundary-sweep",
    async () => {
      await d.viewport(shellPx - 1);
      await d.waitFor(
        `document.querySelector("#shell").dataset.mode === "mobile"`,
        `mobile mode at ${shellPx - 1}px`,
      );
      await d.viewport(shellPx);
      await d.waitFor(
        `document.querySelector("#shell").dataset.mode === "desktop"`,
        `desktop mode at ${shellPx}px`,
      );
    },
    shellUrl,
  );

  await run(
    "shell-mobile-drawer",
    async () => {
      await d.viewport(shellPx - 1);
      await d.waitFor(`document.querySelector("#shell").dataset.mode === "mobile"`, "mobile mode");
      check((await d.style("aside", "display")) === "none", "inline sidebar visible on mobile");
      check(
        (await d.evaluate(
          `document.querySelector("#sidebar-trigger").getAttribute("aria-expanded")`,
        )) === "false",
        "trigger expanded on mobile",
      );
      await d.click("#sidebar-trigger");
      await d.waitFor(dialogOpen, "drawer");
      check((await d.count('a[href="#dashboard"]')) === 1, "sidebar content rendered twice");
      check(
        await d.evaluate(
          `document.querySelector('[role="dialog"]').contains(document.querySelector("#side-dashboard"))`,
        ),
        "links not in the drawer",
      );
      await d.waitFor(
        `document.querySelector('[role="dialog"]').contains(document.activeElement)`,
        "focus in drawer",
      );
      await d.click("#side-settings");
      await d.waitFor(`!${dialogOpen}`, "closed after navigation");
      check((await d.active()) === "sidebar-trigger", `focus returned to ${await d.active()}`);
      await d.click("#sidebar-trigger");
      await d.waitFor(dialogOpen, "reopened");
      await d.press("Escape");
      await d.waitFor(`!${dialogOpen}`, "Escape closes");
      await d.click("#sidebar-trigger");
      await d.waitFor(dialogOpen, "reopened for resize");
      await d.viewport(Math.max(shellPx, 1100));
      await d.waitFor(`!${dialogOpen}`, "drawer closed when the viewport became desktop");
      check((await d.style("aside", "display")) === "flex", "sidebar not restored on desktop");
      check((await d.count('a[href="#dashboard"]')) === 1, "duplicate links after resize");
    },
    shellUrl,
  );

  // --- Accessibility (axe-core) ------------------------------------------------------------------
  if (axeSource) {
    const axe = async (label, open) => {
      await run(`axe-${label}`, async () => {
        if (open) await open();
        await d.evaluate(axeSource);
        const result = await d.evaluate(
          `axe.run(document, { resultTypes: ["violations"] }).then((r) => r.violations.map((v) => v.id + " (" + v.impact + "): " + v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")))`,
        );
        check(result.length === 0, result.join(" | "));
      });
    };
    for (const scheme of ["light", "dark"]) {
      await page.emulateColorScheme(scheme);
      await d.viewport(1280);
      await d.reload(labUrl);
      await d.evaluate(`document.documentElement.setAttribute("data-neshel-theme", "system")`);
      await d.settle(400); // colour transitions finish before contrast is measured
      await axe(`lab-${scheme}`);
      await axe(`dialog-${scheme}`, async () => {
        await d.click("#dialog-trigger");
        await d.waitFor(dialogOpen, "dialog");
        await d.settle(300);
      });
      await d.reload(shellUrl);
      await d.evaluate(`document.documentElement.setAttribute("data-neshel-theme", "system")`);
      await d.settle(400); // colour transitions finish before contrast is measured
      await axe(`shell-${scheme}`);
      await axe(`shell-rail-${scheme}`, async () => {
        await d.click("#sidebar-trigger");
        await d.settle(320);
      });
    }
    await page.emulateColorScheme("light");
  }

  // --- Negative controls (FR-124): the checks above must be able to fail ---------------------
  if (axeSource) {
    await run("negative-axe-detects-missing-name", async () => {
      await d.reload(labUrl);
      await d.evaluate(`document.querySelector("#popover-trigger").textContent = ""`);
      await d.evaluate(axeSource);
      const ids = await d.evaluate(
        `axe.run(document, { resultTypes: ["violations"] }).then((r) => r.violations.map((v) => v.id))`,
      );
      check(
        ids.includes("button-name"),
        `axe did not report the unnamed button (${ids.join(", ")})`,
      );
    });
  }
  await run("negative-shell-without-stylesheet", async () => {
    await d.viewport(Math.max(shellPx, 1100));
    await d.reload(shellUrl);
    await d.evaluate(`(() => {
      for (const sheet of document.styleSheets) {
        const walk = (list, owner) => { for (let i = list.length - 1; i >= 0; i--) { const r = list[i]; if (r.selectorText !== undefined) { if (r.selectorText.includes(".neshel-")) owner.deleteRule(i); } else if (r.cssRules) walk(r.cssRules, r); } };
        walk(sheet.cssRules, sheet);
      }
    })()`);
    await d.settle(100);
    const width = await d.evaluate(
      `Math.round(document.querySelector("aside").getBoundingClientRect().width)`,
    );
    check(
      width !== 256,
      "the sidebar keeps its width without the components stylesheet (vacuous check)",
    );
  });

  return { failures, cases, passed: cases.filter((c) => c.ok).length };
}
