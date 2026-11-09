// Release requirement R1 (feature 006, research R13): the overlay backdrop must dim in engines
// without CSS light-dark(). Uses the RAW package stylesheets (as shipped in the tarball), because
// bundlers such as Vite (Lightning CSS) may already transpile light-dark() for their targets while
// others pass the CSS through unchanged.
//
// An engine without light-dark() is simulated by renaming "light-dark(" in a copy of the
// stylesheet: the backdrop declaration then becomes invalid at computed-value time (exactly what
// such engines do: it contains var(), so it parses) and `@supports not (color: light-dark(…))`
// matches. A negative control deletes the fallback blocks and must reproduce the transparent
// backdrop. Contexts: light (no attribute), data-neshel-theme="dark", and "system" under an
// emulated dark preference.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** [r, g, b] (0–255) and alpha from rgb()/rgba()/color(srgb …) computed values. */
export function parseColor(color) {
  if (color === "transparent") return { rgb: [0, 0, 0], alpha: 0 };
  const numbers = (color.match(/-?[\d.]+/g) ?? []).map(Number);
  const srgb = color.startsWith("color(srgb");
  return {
    rgb: numbers.slice(0, 3).map((n) => Math.round(srgb ? n * 255 : n)),
    alpha: numbers.length > 3 ? numbers[3] : 1,
  };
}

function pageHtml(css) {
  return `<!doctype html><html><head><style id="neshel">${css.replace(/<\/style/gi, "<\\/style")}</style></head><body>
  <div id="light"><div class="neshel-overlay"></div></div>
  <div id="dark" data-neshel-theme="dark"><div class="neshel-overlay"></div></div>
  <div id="system" data-neshel-theme="system"><div class="neshel-overlay"></div></div>
</body></html>`;
}

async function measure(page, css, scheme) {
  await page.emulateColorScheme(scheme);
  await page.goto(`data:text/html;charset=utf-8,${encodeURIComponent(pageHtml(css))}`);
  await sleep(100);
  return page.evaluate(`(() => {
    const out = {};
    for (const id of ["light", "dark", "system"]) {
      const overlay = document.querySelector("#" + id + " .neshel-overlay");
      const probe = (role) => { const p = document.createElement("div"); p.style.color = "var(--neshel-" + role + ")"; overlay.append(p); const v = getComputedStyle(p).color; p.remove(); return v; };
      out[id] = { backdrop: getComputedStyle(overlay).backgroundColor, foreground: probe("foreground"), background: probe("background") };
    }
    return out;
  })()`);
}

/** Remove @supports blocks mentioning `needle` from the stylesheet text (brace matching). */
export function removeSupportsBlocks(css, needle) {
  let out = css;
  for (;;) {
    const start = out.indexOf("@supports");
    let found = -1;
    for (let at = start; at !== -1; at = out.indexOf("@supports", at + 1)) {
      const open = out.indexOf("{", at);
      if (out.slice(at, open).includes(needle)) {
        found = at;
        break;
      }
    }
    if (found === -1) return out;
    let depth = 0;
    let end = out.indexOf("{", found);
    for (; end < out.length; end++) {
      if (out[end] === "{") depth++;
      else if (out[end] === "}" && --depth === 0) break;
    }
    out = out.slice(0, found) + out.slice(end + 1);
  }
}

/**
 * Returns { cases: [{ id, ok, error? }] } for the R1 checks, given the raw config tokens and
 * components stylesheets.
 */
export async function runBackdropSuite(page, { tokensCss, componentsCss }) {
  const cases = [];
  const check = (id, ok, detail) => cases.push(ok ? { id, ok } : { id, ok, error: detail });
  const raw = `${tokensCss}\n${componentsCss}`;
  if (!componentsCss.includes("light-dark(")) {
    check(
      "backdrop-uses-light-dark",
      false,
      "the components stylesheet no longer uses light-dark()",
    );
    return { cases };
  }
  const simulated = raw.replaceAll("light-dark(", "nolight-dark(");
  const control = removeSupportsBlocks(simulated, "nolight-dark");

  const modern = await measure(page, raw, "light");
  check(
    "backdrop-with-light-dark",
    ["light", "dark", "system"].every((id) => parseColor(modern[id].backdrop).alpha > 0.3),
    JSON.stringify(modern),
  );

  const light = await measure(page, simulated, "light");
  const dark = await measure(page, simulated, "dark");
  const sameRgb = (a, b) => JSON.stringify(parseColor(a).rgb) === JSON.stringify(parseColor(b).rgb);
  check(
    "fallback-light-context-dims-with-foreground",
    parseColor(light.light.backdrop).alpha > 0.3 &&
      sameRgb(light.light.backdrop, light.light.foreground),
    JSON.stringify(light.light),
  );
  check(
    "fallback-dark-theme-dims-with-background",
    parseColor(light.dark.backdrop).alpha > 0.5 &&
      sameRgb(light.dark.backdrop, light.dark.background),
    JSON.stringify(light.dark),
  );
  check(
    "fallback-system-light-preference",
    parseColor(light.system.backdrop).alpha > 0.3 &&
      sameRgb(light.system.backdrop, light.system.foreground),
    JSON.stringify(light.system),
  );
  check(
    "fallback-system-dark-preference",
    parseColor(dark.system.backdrop).alpha > 0.5 &&
      sameRgb(dark.system.backdrop, dark.system.background),
    JSON.stringify(dark.system),
  );
  const negative = await measure(page, control, "light");
  check(
    "negative-control-without-fallback-is-transparent",
    ["light", "dark", "system"].every((id) => parseColor(negative[id].backdrop).alpha === 0),
    JSON.stringify(negative),
  );
  return { cases };
}
