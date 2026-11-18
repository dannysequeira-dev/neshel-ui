// pnpm check:animations:routers [--no-build] [--only next|react-router] [--keep]
// Phase 013 (FR-030, FR-044; contracts/router-adapters.md §4): real router consumers OUTSIDE the workspace
// built from the PACKED @neshel-ui/animations tarball, exercised in Playwright Chromium:
//   - React Router 8.5.0 (data router) in a Vite app — offline (react, react-dom, react-router linked from the
//     workspace install), served with an SPA fallback;
//   - Next.js 16.4.5 App Router — `pnpm install` from the registry (network), `next build` + `next start`.
// Cases: push and back/forward (native View Transitions observed, direction from the Navigation API), the
// router's real pending state on a slow route (PT07 pending → idle), a failing route (never stuck), a
// modified click / new-tab link left native, rapid navigation (final URL wins, no names left), focus after
// commit, keyboard activation, no hydration or page errors. Playwright Chromium only: Firefox/WebKit router
// runs are recorded as unverified (evidence.md §6).
// Without Playwright/Chromium: fails when CI=true, otherwise prints SKIPPED.
import { spawn } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { createServer as createNetServer } from "node:net";
import { dirname, extname, join, normalize, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { packPackage, pnpm } from "./lib/pnpm.mjs";
import { readTarGz } from "./lib/tar.mjs";
import { createTempDir } from "./lib/temp.mjs";
import { repoRoot } from "./lib/workspace.mjs";

const PACKAGE = join(repoRoot, "packages", "animations");
const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const only = arg("--only");
const keep = process.argv.includes("--keep");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
  console.info(`${condition ? "ok  " : "FAIL"} ${message}`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Records every startViewTransition (types and direction attribute at call time). */
const INSTRUMENT = `(() => {
  window.__vt = [];
  if (!document.startViewTransition) return;
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = (arg) => {
    window.__vt.push({
      types: arg && arg.types ? [...arg.types] : [],
      direction: document.documentElement.getAttribute("data-neshel-pt-direction"),
    });
    return start(arg);
  };
})();`;

const ROUTER_APP = `import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet, Link } from "react-router";
import { PageTransition, SharedElement } from "@neshel-ui/animations/page-transitions";
import { RouterPageTransitions } from "@neshel-ui/animations/page-transitions/react-router";
import "@neshel-ui/animations/page-transitions.css";

function Layout() {
  return (
    <RouterPageTransitions progress={{ delay: 0 }}>
      <nav>
        <Link id="to-home" to="/">Home</Link>
        <Link id="to-about" to="/about">About</Link>
        <Link id="to-about-current" to="/about">About (again)</Link>
        <Link id="to-slow" to="/slow">Slow</Link>
        <Link id="to-broken" to="/broken">Broken</Link>
        <Link id="to-new-tab" to="/about" target="_blank">About in a new tab</Link>
      </nav>
      <PageTransition effect="slide"><Outlet /></PageTransition>
    </RouterPageTransitions>
  );
}
const page = (title) => (
  <main>
    <h1 data-neshel-route-focus="" id={"title-" + title.toLowerCase()}>{title}</h1>
    <SharedElement name="badge"><span className="badge">{title} badge</span></SharedElement>
  </main>
);
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: page("Home") },
      { path: "about", element: page("About") },
      { path: "slow", loader: () => new Promise((r) => setTimeout(() => r(null), 900)), element: page("Slow") },
      {
        path: "broken",
        loader: () => { throw new Error("route data failed"); },
        element: page("Never"),
        errorElement: <p id="route-error">Could not load this page.</p>,
      },
    ],
  },
]);
window.__errors = [];
createRoot(document.getElementById("root")).render(<RouterProvider router={router} />);
`;

const NEXT_LAYOUT = `import { Providers } from "./providers";
import "@neshel-ui/animations/page-transitions.css";
export const metadata = { title: "router consumer" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`;
const NEXT_PROVIDERS = `"use client";
import { PageTransition } from "@neshel-ui/animations/page-transitions";
import { NextPageTransitions, TransitionLink } from "@neshel-ui/animations/page-transitions/next";
export function Providers({ children }) {
  return (
    <NextPageTransitions progress={{ delay: 0 }}>
      <nav>
        <TransitionLink id="to-home" href="/">Home</TransitionLink>
        <TransitionLink id="to-about" href="/about" effect="slide">About</TransitionLink>
        <TransitionLink id="to-about-current" href="/about">About (again)</TransitionLink>
        <TransitionLink id="to-slow" href="/slow">Slow</TransitionLink>
        <TransitionLink id="to-new-tab" href="/about" target="_blank">About in a new tab</TransitionLink>
        <a id="external" href="https://example.invalid/">External</a>
      </nav>
      <PageTransition effect="slide">{children}</PageTransition>
    </NextPageTransitions>
  );
}
`;
const nextPage = (
  title,
  slow = false,
) => `${slow ? 'export const dynamic = "force-dynamic";\n' : ""}import { SharedElement } from "@neshel-ui/animations/page-transitions";
export default async function Page() {
  ${slow ? "await new Promise((r) => setTimeout(r, 900));" : ""}
  return (
    <main>
      <h1 data-neshel-route-focus="" id="title-${title.toLowerCase()}">${title}</h1>
      <SharedElement name="badge"><span className="badge">${title} badge</span></SharedElement>
    </main>
  );
}
`;

function link(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  symlinkSync(realpathSync(from), to, "junction");
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function staticServer(root) {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, "http://x").pathname);
    let file = normalize(join(root, path));
    if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
      file = join(root, "index.html"); // SPA fallback
    }
    response.setHeader("content-type", types[extname(file)] ?? "application/octet-stream");
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function waitForHttp(url, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`server did not answer ${url} within ${timeout} ms`);
}

/** The shared navigation scenario; `name` prefixes every check. */
async function scenario(context, origin, name, { broken }) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon|example\.invalid/.test(message.text())) {
      errors.push(message.text());
    }
  });
  await page.addInitScript(INSTRUMENT);
  await page.goto(`${origin}/`);
  await page.waitForSelector("#title-home");
  const state = (expression) => page.evaluate(expression);
  const until = (expression, timeout = 4000) =>
    page.waitForFunction(expression, null, { timeout }).then(
      () => true,
      () => false,
    );

  await page.click("#to-about");
  const pushed = await until(
    `location.pathname === "/about" && document.getElementById("title-about")`,
  );
  await until(
    `!document.documentElement.hasAttribute("data-neshel-pt-effect") && window.__vt.length > 0`,
    2000,
  );
  const afterPush = await state(
    `({ vt: window.__vt.slice(), focus: document.activeElement?.id, direction: document.documentElement.getAttribute("data-neshel-pt-direction") })`,
  );
  check(pushed, `${name}: push navigation commits the new route`);
  check(
    afterPush.vt.length >= 1 &&
      (afterPush.vt.at(-1).direction === "forward" ||
        afterPush.vt.at(-1).types.includes("neshel-forward")),
    `${name}: push runs inside a native View Transition, direction forward (attribute or type) (${JSON.stringify(afterPush.vt)})`,
  );
  check(
    afterPush.focus === "title-about",
    `${name}: focus moved after the commit (${afterPush.focus})`,
  );

  const before = afterPush.vt.length;
  await state("window.__focusedBeforeBack = document.activeElement");
  await page.goBack();
  const back = await until(`location.pathname === "/" && document.getElementById("title-home")`);
  await until(`window.__vt.length > ${before}`, 2000);
  const afterBack = await state(
    `({ vt: window.__vt.slice(${before}), direction: document.documentElement.getAttribute("data-neshel-pt-direction"), kept: document.activeElement === window.__focusedBeforeBack || document.activeElement === document.body })`,
  );
  check(back, `${name}: browser back restores the previous route`);
  check(
    afterBack.direction === "back",
    `${name}: back is detected from history indexes (${afterBack.direction})`,
  );
  check(
    afterBack.vt.length === 0 || afterBack.vt.at(-1).direction === "back",
    `${name}: a back transition (when the router uses one) sees direction back (${JSON.stringify(afterBack.vt)})`,
  );
  check(afterBack.kept, `${name}: no focus move on traverse (focus stays where it was)`);
  await page.goForward();
  const forward = await until(`location.pathname === "/about"`);
  check(
    forward &&
      (await state(`document.documentElement.getAttribute("data-neshel-pt-direction")`)) ===
        "forward",
    `${name}: forward traverse detected as forward`,
  );

  await page.click("#to-slow");
  const pending = await until(
    `document.querySelector(".neshel-route-progress")?.getAttribute("data-state") === "pending"`,
    700,
  );
  const stillOld = await state(
    `location.pathname === "/about" || !document.getElementById("title-slow")`,
  );
  const arrived = await until(`document.getElementById("title-slow")`, 5000);
  const idle = await until(
    `document.querySelector(".neshel-route-progress")?.getAttribute("data-state") === "idle"`,
    3000,
  );
  check(
    pending && stillOld,
    `${name}: a slow route shows the real pending state before it commits`,
  );
  check(arrived && idle, `${name}: progress completes and returns to idle after the commit`);

  // Owner review D: a navigation superseded before it commits (slow route, then a link to the CURRENT
  // route) must not leave the indicator pending; a later navigation must show its own pending state.
  await page.click("#to-about");
  await page.waitForSelector("#title-about");
  await until(
    `document.querySelector(".neshel-route-progress")?.getAttribute("data-state") === "idle"`,
    3000,
  );
  await page.evaluate(`(() => {
    window.__progressStates = [];
    const bar = document.querySelector(".neshel-route-progress");
    new MutationObserver(() => window.__progressStates.push(bar.getAttribute("data-state"))).observe(bar, { attributes: true, attributeFilter: ["data-state"] });
  })()`);
  await page.click("#to-slow");
  await page.click("#to-about-current");
  await page.waitForTimeout(1600); // past the slow route's 900 ms: it would have committed if not superseded
  const supersededPath = await state("location.pathname");
  const supersededState = await state(
    `document.querySelector(".neshel-route-progress")?.getAttribute("data-state")`,
  );
  check(
    supersededState === "idle",
    `${name}: a navigation superseded without commit does not stay pending (${supersededState}, at ${supersededPath})`,
  );
  await page.evaluate("window.__progressStates.length = 0");
  await page.click("#to-slow");
  const restarted = await until(`window.__progressStates.includes("pending")`, 700);
  await until(`document.getElementById("title-slow")`, 5000);
  await until(
    `document.querySelector(".neshel-route-progress")?.getAttribute("data-state") === "idle"`,
    3000,
  );
  check(restarted, `${name}: the next navigation shows its own pending state`);

  if (broken) {
    await page.click("#to-broken");
    const failed = await until(`document.getElementById("route-error")`);
    const settled = await until(
      `document.querySelector(".neshel-route-progress")?.getAttribute("data-state") === "idle"`,
      3000,
    );
    check(
      failed && settled,
      `${name}: a failing route shows its error and never leaves the bar active`,
    );
    await page.click("#to-home");
    await page.waitForSelector("#title-home");
  }

  const popupPromise = context.waitForEvent("page", { timeout: 5000 }).catch(() => undefined);
  await page.click("#to-new-tab");
  const popup = await popupPromise;
  const urlAfterTab = await state("location.pathname");
  const pendingAfterTab = await state(
    `document.querySelector(".neshel-route-progress")?.getAttribute("data-state")`,
  );
  check(Boolean(popup), `${name}: a target=_blank link still opens a new tab`);
  check(
    pendingAfterTab === "idle",
    `${name}: the new-tab link starts no pending state (${pendingAfterTab}, at ${urlAfterTab})`,
  );
  await popup?.close();

  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  const modifiedPromise = context.waitForEvent("page", { timeout: 5000 }).catch(() => undefined);
  const beforeModified = await state("location.pathname");
  await page.click("#to-home", { modifiers: [modifier] });
  const modified = await modifiedPromise;
  await sleep(300);
  check(
    (await state("location.pathname")) === beforeModified,
    `${name}: a modified click leaves the current page in place (${modified ? "new tab opened" : "no tab event"})`,
  );
  await modified?.close();

  await page.focus("#to-about");
  await page.keyboard.press("Enter");
  check(await until(`location.pathname === "/about"`), `${name}: keyboard activation navigates`);
  await page.click("#to-home");
  await page.click("#to-about");
  await page.click("#to-home");
  const rapid = await until(`location.pathname === "/" && document.getElementById("title-home")`);
  const clean = await until(
    `![...document.querySelectorAll("*")].some((el) => el.style && el.style.getPropertyValue("view-transition-name")) && !document.documentElement.hasAttribute("data-neshel-pt-effect")`,
    3000,
  );
  check(rapid && clean, `${name}: rapid navigation ends on the last route with no names left`);
  check(errors.length === 0, `${name}: no page or hydration errors (${errors.join(" | ")})`);
  await page.close();
}

async function main() {
  let playwright;
  try {
    playwright = createRequire(join(repoRoot, "package.json"))("playwright");
  } catch {
    if (process.env.CI === "true") throw new Error("Playwright is not installed");
    console.info("check:animations:routers SKIPPED (Playwright not installed)");
    return;
  }
  if (!process.argv.includes("--no-build")) {
    pnpm(["--filter", "@neshel-ui/animations", "build"], repoRoot);
  }
  const temp = createTempDir("neshel routers ñ-", { keep });
  const servers = [];
  let browser;
  try {
    const tarball = packPackage(PACKAGE, join(temp.dir, "tarball"));
    browser = await playwright.chromium.launch();
    console.info(`Chromium ${browser.version()}`);

    if (!only || only === "react-router") {
      const app = join(temp.dir, "react router app");
      const modules = join(app, "node_modules");
      for (const [path, contents] of readTarGz(readFileSync(tarball))) {
        const file = join(
          modules,
          "@neshel-ui",
          "animations",
          ...path.replace(/^package\//, "").split("/"),
        );
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, contents);
      }
      const workspace = join(PACKAGE, "node_modules");
      for (const name of ["react", "react-dom", "react-router"])
        link(join(workspace, name), join(modules, name));
      link(join(workspace, "@radix-ui", "react-slot"), join(modules, "@radix-ui", "react-slot"));
      writeFileSync(
        join(app, "package.json"),
        JSON.stringify({ name: "rr-consumer", private: true, type: "module" }),
      );
      mkdirSync(join(app, "src"));
      writeFileSync(join(app, "src", "main.jsx"), ROUTER_APP);
      writeFileSync(
        join(app, "index.html"),
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>rr</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`,
      );
      const fromPlayground = createRequire(
        join(repoRoot, "apps", "playground-vite", "package.json"),
      );
      const { build } = await import(pathToFileURL(fromPlayground.resolve("vite")).href);
      const react = (
        await import(pathToFileURL(fromPlayground.resolve("@vitejs/plugin-react")).href)
      ).default;
      await build({ configFile: false, logLevel: "silent", root: app, plugins: [react()] });
      const server = await staticServer(join(app, "dist"));
      servers.push(server);
      const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
      await scenario(context, `http://127.0.0.1:${server.address().port}`, "react-router 8.5.0", {
        broken: true,
      });
      await context.close();
    }

    if (!only || only === "next") {
      const app = join(temp.dir, "next app ñ");
      mkdirSync(join(app, "app", "about"), { recursive: true });
      mkdirSync(join(app, "app", "slow"), { recursive: true });
      writeFileSync(
        join(app, "package.json"),
        JSON.stringify(
          {
            name: "next-router-consumer",
            private: true,
            scripts: { build: "next build" },
            dependencies: {
              "@neshel-ui/animations": `file:${tarball.split(sep).join("/")}`,
              next: "16.4.5",
              react: "19.3.1",
              "react-dom": "19.3.1",
            },
          },
          null,
          2,
        ),
      );
      writeFileSync(join(app, "next.config.mjs"), "export default {};\n");
      writeFileSync(join(app, "app", "layout.jsx"), NEXT_LAYOUT);
      writeFileSync(join(app, "app", "providers.jsx"), NEXT_PROVIDERS);
      writeFileSync(join(app, "app", "page.jsx"), nextPage("Home"));
      writeFileSync(join(app, "app", "about", "page.jsx"), nextPage("About"));
      writeFileSync(join(app, "app", "slow", "page.jsx"), nextPage("Slow", true));
      console.info("next: pnpm install (registry)…");
      pnpm(["install", "--ignore-workspace", "--no-frozen-lockfile"], app, { isolated: true });
      console.info("next: next build…");
      const log = pnpm(["run", "build"], app, { isolated: true });
      check(
        /Route \(app\)|Compiled successfully/.test(log),
        "next 16.4.5: production build of the App Router consumer",
      );
      const port = await freePort();
      const server = spawn(
        process.execPath,
        [
          join(app, "node_modules", "next", "dist", "bin", "next"),
          "start",
          "-p",
          String(port),
          "-H",
          "127.0.0.1",
        ],
        {
          cwd: app,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, NODE_ENV: "production" },
        },
      );
      servers.push({ close: () => server.kill() });
      const origin = `http://127.0.0.1:${port}`;
      const html = await (await waitForHttp(`${origin}/`)).text();
      check(
        html.includes('id="title-home"') && html.includes("neshel-route-progress"),
        "next 16.4.5: server-rendered page and progress markup",
      );
      const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
      await scenario(context, origin, "next 16.4.5", { broken: false });
      await context.close();
    }
  } finally {
    for (const server of servers) server.close();
    await browser?.close();
    temp.dispose();
  }
  if (failures.length) {
    console.error(`check:animations:routers failed: ${failures.length} check(s).`);
    process.exitCode = 1;
  } else console.info("check:animations:routers passed.");
}

main().catch((error) => {
  console.error(`check:animations:routers could not complete: ${error.stack ?? error}`);
  process.exitCode = 1;
});
