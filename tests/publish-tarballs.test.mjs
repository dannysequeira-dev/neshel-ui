import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import {
  isPublishConflict,
  npmErrorCode,
  ORDER,
  publishTarballs,
  queryVersion,
  withRetries,
} from "../scripts/publish-tarballs.mjs";

const VERSION = "0.1.0";

// npm 11 warnings printed on stderr in release run 42843343125 (repository .npmrc pnpm settings).
const NPM_WARNINGS = [
  "manage-package-manager-versions",
  "strict-peer-dependencies",
  "auto-install-peers",
  "save-workspace-protocol",
]
  .map(
    (key) =>
      `npm warn Unknown project config "${key}". This will stop working in the next major version of npm. See \`npm help npmrc\` for supported config options.`,
  )
  .join("\n");

const ok = (stdout, stderr = NPM_WARNINGS) => ({ status: 0, stdout, stderr });
const fail = (code, summary, extra = "") => ({
  status: 1,
  stdout: JSON.stringify({ error: { code, summary, detail: "" } }, null, 2),
  stderr: `${NPM_WARNINGS}\nnpm error code ${code}\nnpm error ${summary}${extra}`,
});
const E404 = fail(
  "E404",
  "Not Found - GET https://registry.npmjs.org/@neshel-ui%2fconfig - Not found",
);
const E401 = fail("E401", 'Unable to authenticate, need: Basic realm="GitHub Package Registry"');
const ETIMEDOUT = fail(
  "ETIMEDOUT",
  "request to https://registry.npmjs.org/ failed, reason: timeout",
);
const E500 = fail(
  "E500",
  "500 Internal Server Error - GET https://registry.npmjs.org/@neshel-ui%2fconfig",
);
const CONFLICT = {
  status: 1,
  stdout: "",
  stderr: `${NPM_WARNINGS}\nnpm error code E403\nnpm error 403 403 Forbidden - PUT https://registry.npmjs.org/@neshel-ui%2fconfig - You cannot publish over the previously published versions: 0.1.0.`,
};

const root = mkdtempSync(join(tmpdir(), "neshel publish test ñ-"));
after(() => rmSync(root, { recursive: true, force: true }));

function tarballDir(names = ORDER) {
  const dir = mkdtempSync(join(root, "tarballs "));
  for (const name of names) writeFileSync(join(dir, `neshel-ui-${name}-${VERSION}.tgz`), "");
  return dir;
}

/**
 * Fake npm: `respond(args, calls)` returns a result for each call; every call is recorded.
 * Default: view → present (with warnings), publish → success.
 */
function fakeNpm(respond = () => undefined) {
  const calls = [];
  const run = (args, options = {}) => {
    calls.push({ args, cwd: options.cwd });
    const custom = respond(args, calls, options);
    if (custom) return custom;
    if (args[0] === "view") return ok(`"${VERSION}"\n`);
    return ok("");
  };
  return { run, calls };
}

const publishes = (calls) => calls.filter((c) => c.args[0] === "publish");
const views = (calls) => calls.filter((c) => c.args[0] === "view");
const noSleep = async () => {};

test("an existing version is present despite npm warnings on stderr (regression: run 42843343125)", () => {
  const { run } = fakeNpm();
  assert.deepEqual(queryVersion("@neshel-ui/config", VERSION, run), { state: "present" });
});

test("queryVersion uses only stdout: warnings never become part of the compared value", () => {
  const run = () => ({ status: 0, stdout: '"0.1.0"', stderr: `${NPM_WARNINGS}\n0.2.0` });
  assert.equal(queryVersion("@neshel-ui/config", VERSION, run).state, "present");
});

test("E404 and an empty answer are reported as missing", () => {
  assert.equal(queryVersion("@neshel-ui/config", VERSION, () => E404).state, "missing");
  assert.equal(queryVersion("@neshel-ui/config", VERSION, () => ok("")).state, "missing");
  // Text-only error (no --json body on stdout), as older npm versions print it.
  const textOnly = { status: 1, stdout: "", stderr: "npm ERR! code E404\nnpm ERR! 404 Not Found" };
  assert.equal(queryVersion("@neshel-ui/config", VERSION, () => textOnly).state, "missing");
});

test("network, authentication and registry failures are errors, not missing", () => {
  for (const [result, code] of [
    [E401, "E401"],
    [ETIMEDOUT, "ETIMEDOUT"],
    [E500, "E500"],
  ]) {
    const query = queryVersion("@neshel-ui/config", VERSION, () => result);
    assert.equal(query.state, "error", code);
    assert.match(query.detail, new RegExp(code));
    assert.doesNotMatch(query.detail, /npm warn/, "warnings are dropped from the summary");
  }
  const spawnError = { status: null, stdout: "", stderr: "", error: new Error("spawn npm ENOENT") };
  assert.match(queryVersion("@neshel-ui/config", VERSION, () => spawnError).detail, /ENOENT/);
  const unexpected = queryVersion("@neshel-ui/config", VERSION, () => ok('"0.0.9"'));
  assert.equal(unexpected.state, "error");
});

test("npmErrorCode reads JSON bodies and text lines; isPublishConflict reads the E403 text", () => {
  assert.equal(npmErrorCode(E404), "E404");
  assert.equal(npmErrorCode({ stdout: "", stderr: "npm error code ECONNRESET" }), "ECONNRESET");
  assert.equal(npmErrorCode(ok('"0.1.0"')), undefined);
  assert.equal(isPublishConflict(CONFLICT), true);
  assert.equal(isPublishConflict(E401), false);
});

test("publish run: existing versions are skipped and npm publish is never called", async () => {
  const { run, calls } = fakeNpm();
  const log = [];
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    run,
    log: (l) => log.push(l),
  });
  assert.deepEqual(failures, []);
  assert.equal(publishes(calls).length, 0);
  assert.equal(log.filter((l) => l.includes("already published")).length, ORDER.length);
});

test("publish run: missing versions are published in dependency order with provenance", async () => {
  const { run, calls } = fakeNpm((args) => (args[0] === "view" ? E404 : undefined));
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    run,
    log: () => {},
  });
  assert.deepEqual(failures, []);
  const published = publishes(calls).map((c) => c.args[1]);
  assert.deepEqual(
    published.map((path) => /neshel-ui-(\w+)-/.exec(path)[1]),
    ORDER,
  );
  for (const call of publishes(calls)) {
    assert.deepEqual(call.args.slice(2), ["--access", "public", "--provenance"]);
  }
});

test("publish run: a failed registry query blocks publication instead of attempting it", async () => {
  const { run, calls } = fakeNpm((args) => (args[0] === "view" ? E401 : undefined));
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    run,
    log: () => {},
  });
  assert.equal(failures.length, ORDER.length);
  assert.match(failures[0], /cannot determine whether 0\.1\.0 is published[\s\S]*E401/);
  assert.equal(publishes(calls).length, 0);
});

test("publish run: a conflict on a version that now exists is treated as already published", async () => {
  const seen = new Map();
  const { run } = fakeNpm((args) => {
    if (args[0] === "publish") return CONFLICT;
    const count = (seen.get(args[1]) ?? 0) + 1;
    seen.set(args[1], count);
    return count === 1 ? E404 : undefined; // lagging registry: missing first, present on recheck
  });
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    run,
    log: () => {},
  });
  assert.deepEqual(failures, []);
});

test("publish run: a real publish failure is reported without npm warnings noise", async () => {
  const { run } = fakeNpm((args) => {
    if (args[0] === "view") return E404;
    return fail(
      "E403",
      "403 Forbidden - PUT https://registry.npmjs.org/@neshel-ui%2fconfig - no permission",
    );
  });
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    run,
    log: () => {},
  });
  assert.equal(failures.length, ORDER.length);
  assert.match(failures[0], /npm publish failed[\s\S]*no permission/);
  assert.doesNotMatch(failures[0], /npm warn/);
});

test("a missing tarball is reported and nothing is queried for it", async () => {
  const { run, calls } = fakeNpm();
  const failures = await publishTarballs({
    dir: tarballDir(ORDER.filter((name) => name !== "cli")),
    version: VERSION,
    run,
    log: () => {},
  });
  assert.deepEqual(failures, ["@neshel-ui/cli: tarball neshel-ui-cli-0.1.0.tgz not found"]);
  assert.equal(
    views(calls).some((c) => c.args[1].startsWith("@neshel-ui/cli@")),
    false,
  );
});

function appDirFactory() {
  return () => {
    const app = mkdtempSync(join(root, "verify app "));
    return app;
  };
}

/** Fake install that writes node_modules manifests with `installedVersion`. */
function installInto(cwd, installedVersion = VERSION) {
  for (const name of ORDER) {
    const dir = join(cwd, "node_modules", "@neshel-ui", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: `@neshel-ui/${name}`, version: installedVersion }),
    );
  }
  return ok("added 42 packages");
}

test("verify-only: retries while the registry propagates, then installs cleanly", async () => {
  const attempts = new Map();
  const slept = [];
  const { run, calls } = fakeNpm((args, _calls, options) => {
    if (args[0] === "install") return installInto(options.cwd);
    if (args[0] !== "view") return undefined;
    const n = (attempts.get(args[1]) ?? 0) + 1;
    attempts.set(args[1], n);
    if (n === 1) return E404; // not visible yet
    if (n === 2) return ETIMEDOUT; // transient network error
    return undefined; // present
  });
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    verifyOnly: true,
    run,
    sleep: async (ms) => slept.push(ms),
    delays: [1, 2, 3],
    log: () => {},
    makeAppDir: appDirFactory(),
  });
  assert.deepEqual(failures, []);
  assert.equal(views(calls).length, ORDER.length * 3);
  assert.deepEqual(slept, Array(ORDER.length).fill([1, 2]).flat());
  assert.equal(publishes(calls).length, 0, "verify-only never publishes");
  const install = calls.find((c) => c.args[0] === "install");
  assert.ok(install.cwd.startsWith(root), "installs in the fresh directory, not the repository");
});

test("verify-only: retries are bounded and the last error is reported", async () => {
  const { run, calls } = fakeNpm((args) => (args[0] === "view" ? E500 : undefined));
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    verifyOnly: true,
    run,
    sleep: noSleep,
    delays: [1, 1],
    log: () => {},
    makeAppDir: appDirFactory(),
  });
  assert.equal(failures.length, ORDER.length);
  assert.match(failures[0], /registry query failed after 3 attempts[\s\S]*E500/);
  assert.equal(views(calls).length, ORDER.length * 3);
  assert.equal(
    calls.some((c) => c.args[0] === "install"),
    false,
    "no install after a failed check",
  );
});

test("verify-only: a version that never appears is reported as not on the registry", async () => {
  const { run } = fakeNpm((args) => (args[0] === "view" ? E404 : undefined));
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    verifyOnly: true,
    run,
    sleep: noSleep,
    delays: [1],
    log: () => {},
    makeAppDir: appDirFactory(),
  });
  assert.match(failures[0], /is not on the registry after 2 attempts/);
});

test("verify-only: install failures are retried and wrong installed versions are rejected", async () => {
  let installs = 0;
  const { run } = fakeNpm((args, _calls, options) => {
    if (args[0] !== "install") return undefined;
    installs += 1;
    return installs === 1 ? ETIMEDOUT : installInto(options.cwd, "0.0.9");
  });
  const failures = await publishTarballs({
    dir: tarballDir(),
    version: VERSION,
    verifyOnly: true,
    run,
    sleep: noSleep,
    delays: [1, 1],
    log: () => {},
    makeAppDir: appDirFactory(),
  });
  assert.equal(installs, 2);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /unexpected versions[\s\S]*@neshel-ui\/config: installed 0\.0\.9/);
});

test("withRetries stops at the first success", async () => {
  let n = 0;
  const outcome = await withRetries(() => ({ done: ++n === 2, value: n }), {
    delays: [1, 1, 1],
    sleep: noSleep,
  });
  assert.deepEqual(outcome, { done: true, value: 2, attempts: 2 });
});
