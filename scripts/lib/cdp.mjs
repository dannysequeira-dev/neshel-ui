// Minimal, dependency-free Chrome DevTools Protocol client for computed-style checks
// (feature 002 research R17). Uses Node's global WebSocket (unflagged since Node 22).
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

/** Candidate browser executables for a platform, in preference order (pure; tested). */
export function browserCandidates(platform, env) {
  if (env.NESHEL_CHROME) return [env.NESHEL_CHROME];
  if (platform === "win32") {
    const roots = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(Boolean);
    return roots.flatMap((root) => [
      join(root, "Google", "Chrome", "Application", "chrome.exe"),
      join(root, "Chromium", "Application", "chrome.exe"),
      join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
    ]);
  }
  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }
  const names = [
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "microsoft-edge",
  ];
  const dirs = (env.PATH ?? "").split(delimiter).filter(Boolean);
  return names.flatMap((name) => dirs.map((dir) => join(dir, name)));
}

/** First existing candidate, or undefined. */
export function findBrowser(platform = process.platform, env = process.env) {
  return browserCandidates(platform, env).find((candidate) => existsSync(candidate));
}

/** Parse the DevTools endpoint printed by Chrome on stderr (pure; tested). */
export function parseDevToolsEndpoint(text) {
  return /DevTools listening on (ws:\/\/\S+)/.exec(text)?.[1];
}

class Connection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
        else resolve(message.result);
      } else {
        for (const listener of this.listeners) listener(message);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params, ...(sessionId ? { sessionId } : {}) };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(payload));
    });
  }

  waitFor(method, sessionId, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`timed out waiting for ${method}`));
      }, timeoutMs);
      const listener = (message) => {
        if (message.method === method && message.sessionId === sessionId) {
          clearTimeout(timer);
          this.listeners.delete(listener);
          resolve(message.params);
        }
      };
      this.listeners.add(listener);
    });
  }
}

/**
 * Launch a headless browser and return { executable, version, newPage, close }.
 * Each page exposes goto(url), emulateColorScheme("light" | "dark"), evaluate(expression).
 */
export async function launchBrowser(executable = findBrowser()) {
  if (!executable) throw new Error("no Chrome, Chromium or Edge executable found");
  const profile = mkdtempSync(join(tmpdir(), "neshel cdp ñ-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--allow-file-access-from-files",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ];
  // GitHub's Ubuntu images restrict unprivileged user namespaces, which Chrome's sandbox needs.
  if (process.platform === "linux") args.unshift("--no-sandbox");
  const child = spawn(executable, args, { stdio: ["ignore", "ignore", "pipe"] });
  const endpoint = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`browser did not start:\n${output}`)), 30000);
    child.stderr.on("data", (chunk) => {
      output += chunk;
      const found = parseDevToolsEndpoint(output);
      if (found) {
        clearTimeout(timer);
        resolve(found);
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`browser exited with code ${code}:\n${output}`));
    });
  });
  child.removeAllListeners("exit");
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("DevTools socket error")), {
      once: true,
    });
  });
  const connection = new Connection(socket);
  const { product } = await connection.send("Browser.getVersion");

  async function newPage() {
    const { targetId } = await connection.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await connection.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    await connection.send("Page.enable", {}, sessionId);
    await connection.send("Runtime.enable", {}, sessionId);
    const errors = [];
    connection.listeners.add((message) => {
      if (message.sessionId !== sessionId) return;
      if (message.method === "Runtime.exceptionThrown") {
        errors.push(message.params.exceptionDetails?.exception?.description ?? "exception");
      } else if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
      }
    });
    return {
      /** Uncaught exceptions and console.error messages seen by this page. */
      errors,
      async screenshot() {
        const { data } = await connection.send(
          "Page.captureScreenshot",
          { format: "png" },
          sessionId,
        );
        return data;
      },
      async goto(url) {
        const loaded = connection.waitFor("Page.loadEventFired", sessionId);
        const { errorText } = await connection.send("Page.navigate", { url }, sessionId);
        if (errorText) throw new Error(`navigation to ${url} failed: ${errorText}`);
        await loaded;
      },
      /** Emulate a viewport (CSS pixels); media queries follow it. */
      setViewport(width, height = 900) {
        return connection.send(
          "Emulation.setDeviceMetricsOverride",
          { width, height, deviceScaleFactor: 1, mobile: false },
          sessionId,
        );
      },
      emulateColorScheme(value) {
        return connection.send(
          "Emulation.setEmulatedMedia",
          { features: [{ name: "prefers-color-scheme", value }] },
          sessionId,
        );
      },
      async evaluate(expression) {
        const { result, exceptionDetails } = await connection.send(
          "Runtime.evaluate",
          { expression, returnByValue: true, awaitPromise: true },
          sessionId,
        );
        if (exceptionDetails) {
          throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
        }
        return result.value;
      },
    };
  }

  async function close() {
    try {
      await connection.send("Browser.close");
    } catch {
      // The browser may close the socket before answering.
    }
    socket.close();
    await new Promise((resolve) => {
      if (child.exitCode !== null) resolve();
      else child.once("exit", resolve);
      setTimeout(resolve, 5000);
    });
    child.kill();
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    } catch (error) {
      // Windows can keep the profile locked briefly after exit; a leftover temp dir is harmless.
      console.warn(`warning: could not remove browser profile ${profile}: ${error.code}`);
    }
  }

  return { executable, version: product, newPage, close };
}
