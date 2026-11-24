// Feature 017 (CI run 45229978481): a browser that never prints its DevTools endpoint must make launchBrowser
// reject AND be killed — otherwise its stderr pipe keeps the process alive and the CI job hangs to its timeout.
// If the child survived, this test file's process would not exit and node:test would report a timeout.
import assert from "node:assert/strict";
import test from "node:test";
import { launchBrowser } from "../scripts/lib/cdp.mjs";

test("launchBrowser: a silent browser is killed and the launch rejects quickly", {
  timeout: 15000,
}, async () => {
  const started = Date.now();
  await assert.rejects(
    launchBrowser(process.execPath, {
      startTimeout: 500,
      prefixArgs: ["-e", "setInterval(() => {}, 1000)", "--"],
    }),
    /did not start within 0.5 s \(process killed\)/,
  );
  assert.ok(Date.now() - started < 5000, "rejected promptly");
});
