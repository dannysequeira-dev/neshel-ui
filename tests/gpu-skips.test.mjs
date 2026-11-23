// K-16 skip rule of the animations browser checks (scripts/lib/gpu-skips.mjs; PR #17 review R2): a skip is never a
// pass, and only Firefox + Linux + an allowlisted WebGL2 row + the NO_WEBGL2 marker may skip.
import assert from "node:assert/strict";
import test from "node:test";
import { classifyCases, countStatuses, isK16Skip, WEBGL2_ROWS } from "../scripts/lib/gpu-skips.mjs";

const gpuRow = (error, id = "D06 ripple (GPU): impacts displace real texture coordinates") => ({
  id,
  ok: false,
  error,
});
const ffLinux = { engine: "firefox", platform: "linux" };

test("K-16: Firefox + Linux + a WebGL2 row + NO_WEBGL2 is skipped, with reason, engine and OS", () => {
  const [item] = classifyCases(
    [gpuRow("NO_WEBGL2: WebGL2 is unavailable in this environment")],
    ffLinux,
  );
  assert.equal(item.status, "skipped");
  assert.equal(item.ok, false, "a skip is not a pass");
  assert.deepEqual(item.skip, {
    rule: "K-16",
    reason: "NO_WEBGL2: WebGL2 is unavailable in this environment",
    engine: "firefox",
    os: "linux",
  });
});

test("K-16: any other engine or OS keeps NO_WEBGL2 as a failure", () => {
  const item = gpuRow("NO_WEBGL2: WebGL2 is unavailable in this environment");
  for (const env of [
    { engine: "chromium", platform: "linux" },
    { engine: "webkit", platform: "linux" },
    { engine: "firefox", platform: "darwin" },
    { engine: "firefox", platform: "win32" },
  ]) {
    assert.equal(isK16Skip(item, env), false, JSON.stringify(env));
    assert.equal(classifyCases([item], env)[0].status, "failed");
  }
});

test("K-16: other failures on Firefox/Linux stay failures (wrong marker or a non-GPU row)", () => {
  const wrongMarker = gpuRow("pixels moved under the waves");
  const nonGpu = gpuRow("NO_WEBGL2: misuse", "D01 card flip: real 3D, hidden face inert");
  const fallback = gpuRow(
    "NO_WEBGL2: misuse",
    "GPU fallback without WebGL2 (separate): native image kept",
  );
  for (const item of [wrongMarker, nonGpu, fallback]) {
    assert.equal(classifyCases([item], ffLinux)[0].status, "failed", item.id);
  }
});

test("K-16 allowlist: the four GPU effects, context loss and the shader-failure fallback only", () => {
  assert.equal(WEBGL2_ROWS.length, 6);
  assert.ok(WEBGL2_ROWS.every((id) => /GPU/.test(id)));
  assert.ok(
    !WEBGL2_ROWS.some((id) => /without WebGL2/.test(id)),
    "the no-WebGL2 fallback must run",
  );
});

test("counts keep passed, skipped and failed apart", () => {
  const cases = classifyCases(
    [
      { id: "a", ok: true },
      gpuRow("NO_WEBGL2: x"),
      gpuRow("NO_WEBGL2: x", "D04 page curl (GPU): mesh"),
      { id: "b", ok: false, error: "boom" },
    ],
    ffLinux,
  );
  assert.deepEqual(countStatuses(cases), { total: 4, passed: 1, skipped: 2, failed: 1 });
});
