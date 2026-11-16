// Motion host: style ownership/restoration (owner requirement 3.1) and channel arbitration (ADR 0022).
// contracts/style-ownership.md, contracts/channels-and-arbitration.md; 009 FR-010–FR-023.
import assert from "node:assert/strict";
import test from "node:test";
import { frames, setupDom } from "./helpers.mjs";

await setupDom();
const { getMotionHost: rawHost } = await import("../dist/core/host.js");
const { isGranted, releaseChannels, requestChannels, resolveConflictPolicy, setExclusive } =
  await import("../dist/core/arbiter.js");
/** The ledger host plus the arbiter functions (split in Phase 009 optimisation, same behaviour). */
const getMotionHost = (element) => {
  const host = rawHost(element);
  return Object.assign(Object.create(host), {
    setLayer: host.setLayer,
    setOpacity: host.setOpacity,
    commit: host.commit,
    request: (claim, policy) => requestChannels(host, claim, policy),
    release: (claim) => releaseChannels(host, claim),
    isGranted: (claim) => isGranted(host, claim),
    setExclusive: (claim, channel, value) => setExclusive(host, claim, channel, value),
  });
};
const { getMotionDebugInfo } = await import("../dist/core/debug.js");
const { NeshelAnimationsError } = await import("../dist/index.js");

const el = () => {
  const element = document.createElement("div");
  element.id = `t${Math.random().toString(36).slice(2, 7)}`;
  document.body.appendChild(element);
  return element;
};
const claim = (id, channels, priority = 0, log = []) => ({
  id,
  priority,
  channels,
  onGrant: () => log.push(`grant:${id}`),
  onRevoke: () => log.push(`revoke:${id}`),
});
function captureWarnings(fn) {
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(String(message));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return warnings;
}

test("captures and restores the original inline value AND priority of an exclusive channel (3.1)", () => {
  const element = el();
  element.style.setProperty("filter", "blur(1px)", "important");
  const host = getMotionHost(element);
  const a = claim("media/grey", ["filter"]);
  assert.equal(host.request(a, "silent"), true);
  host.setExclusive(a, "filter", "grayscale(1)");
  frames.flush();
  assert.equal(element.style.getPropertyValue("filter"), "grayscale(1)");
  assert.equal(element.style.getPropertyPriority("filter"), "important", "captured priority kept");
  host.release(a);
  frames.flush();
  assert.equal(element.style.getPropertyValue("filter"), "blur(1px)");
  assert.equal(element.style.getPropertyPriority("filter"), "important");
});

test("properties that had no inline value are removed on release, not left behind", () => {
  const element = el();
  const host = getMotionHost(element);
  const key = Symbol("k");
  host.setLayer(key, { rotateZ: 5 });
  host.setOpacity(key, 0.5);
  frames.flush();
  assert.equal(element.style.transform, "rotateZ(5deg)");
  assert.equal(element.style.opacity, "0.5");
  assert.equal(element.style.willChange, "transform, opacity");
  host.setLayer(key, undefined);
  host.setOpacity(key, undefined);
  frames.flush();
  assert.equal(element.getAttribute("style"), "", "no residue");
  assert.equal(getMotionDebugInfo(element), undefined, "host released");
});

test("an existing inline transform is kept before the composed layers and restored (3.1 §3)", () => {
  const element = el();
  element.style.transform = "translateX(3px)";
  const host = getMotionHost(element);
  const key = Symbol("tilt");
  host.setLayer(key, { perspective: 800, rotateX: 4 });
  frames.flush();
  assert.equal(element.style.transform, "translateX(3px) perspective(800px) rotateX(4deg)");
  host.setLayer(key, undefined);
  frames.flush();
  assert.equal(element.style.transform, "translateX(3px)");
});

test("opacity contributions multiply with the captured inline opacity", () => {
  const element = el();
  element.style.opacity = "0.5";
  const host = getMotionHost(element);
  const a = Symbol("a");
  const b = Symbol("b");
  host.setOpacity(a, 0.5);
  host.setOpacity(b, 0.8);
  frames.flush();
  assert.equal(element.style.opacity, "0.2");
  host.setOpacity(b, undefined);
  frames.flush();
  assert.equal(element.style.opacity, "0.25");
  host.setOpacity(a, undefined);
  frames.flush();
  assert.equal(element.style.opacity, "0.5");
});

test("will-change is the union of the captured tokens and the active channels, then restored", () => {
  const element = el();
  element.style.willChange = "contents";
  const host = getMotionHost(element);
  const key = Symbol("k");
  host.setLayer(key, { translateY: 2 });
  frames.flush();
  assert.equal(element.style.willChange, "contents, transform");
  host.setLayer(key, undefined);
  frames.flush();
  assert.equal(element.style.willChange, "contents");
});

test("external inline changes during animation become the baseline, with one warning (3.1 §5)", () => {
  const element = el();
  const host = getMotionHost(element);
  const key = Symbol("k");
  host.setLayer(key, { rotateZ: 2 });
  frames.flush();
  element.style.transform = "scale(2)"; // another writer
  const warnings = captureWarnings(() => {
    host.setLayer(key, { rotateZ: 3 });
    frames.flush();
    host.setLayer(key, { rotateZ: 4 });
    frames.flush();
  });
  assert.equal(element.style.transform, "scale(2) rotateZ(4deg)");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /changed outside the engine; kept as the baseline/);
  host.setLayer(key, undefined);
  frames.flush();
  assert.equal(element.style.transform, "scale(2)", "external value restored, never lost");
});

test("external change to an exclusive channel survives release while the owner keeps writing", () => {
  const element = el();
  const host = getMotionHost(element);
  const a = claim("media/a", ["clip-path"]);
  host.request(a, "silent");
  host.setExclusive(a, "clip-path", "inset(10px)");
  frames.flush();
  element.style.clipPath = "circle(40%)";
  captureWarnings(() => {
    host.setExclusive(a, "clip-path", "inset(20px)");
    frames.flush();
  });
  assert.equal(element.style.clipPath, "inset(20px)");
  host.release(a);
  frames.flush();
  assert.equal(element.style.clipPath, "circle(40%)");
});

test("each property is written at most once per frame and only when it changes (3.1 §6)", () => {
  const element = el();
  const host = getMotionHost(element);
  const key = Symbol("k");
  host.setLayer(key, { rotateZ: 1 });
  host.setLayer(key, { rotateZ: 2 });
  host.setLayer(key, { rotateZ: 3 });
  frames.flush();
  const afterFirst = getMotionDebugInfo(element).writes;
  assert.equal(element.style.transform, "rotateZ(3deg)");
  assert.equal(afterFirst, 2, "transform + will-change, once each");
  host.setLayer(key, { rotateZ: 3 }); // same value
  frames.flush();
  assert.equal(getMotionDebugInfo(element).writes, afterFirst, "unchanged value is not rewritten");
  assert.equal(frames.pending, 0);
  host.setLayer(key, undefined);
  frames.flush();
});

test("arbitration: ties keep the existing owner; the waiting claim resumes on release (ADR 0022)", () => {
  const element = el();
  const host = getMotionHost(element);
  const log = [];
  const a = claim("media/a", ["filter"], 0, log);
  const b = claim("media/b", ["filter"], 0, log);
  assert.equal(host.request(a, "silent"), true);
  const warnings = captureWarnings(() => assert.equal(host.request(b, "warn"), false));
  assert.equal(warnings.length, 1);
  assert.match(
    warnings[0],
    /"media\/b" is suspended: "filter" on <div#t[a-z0-9]+> is owned by "media\/a" \(priority 0 vs 0\)/,
  );
  host.setExclusive(b, "filter", "invert(1)"); // discarded while suspended
  host.setExclusive(a, "filter", "blur(2px)");
  frames.flush();
  assert.equal(element.style.filter, "blur(2px)");
  assert.deepEqual(
    getMotionDebugInfo(element).channels.find((c) => c.channel === "filter"),
    {
      channel: "filter",
      mode: "exclusive",
      owner: "media/a",
      waiting: ["media/b"],
      contributions: 1,
    },
  );
  host.release(a);
  assert.deepEqual(log, ["grant:media/b"]);
  assert.equal(host.isGranted(b), true);
  host.setExclusive(b, "filter", "invert(1)");
  frames.flush();
  assert.equal(element.style.filter, "invert(1)");
  host.release(b);
  frames.flush();
  assert.equal(element.style.filter, "");
});

test("arbitration: higher priority preempts; the preempted claim resumes deterministically", () => {
  const element = el();
  const host = getMotionHost(element);
  const log = [];
  const low = claim("media/low", ["filter"], 0, log);
  const high = claim("media/high", ["filter"], 5, log);
  const later = claim("media/later", ["filter"], 0, log);
  host.request(low, "silent");
  host.request(high, "silent");
  host.request(later, "silent");
  assert.deepEqual(log, ["revoke:media/low"]);
  assert.equal(host.isGranted(high), true);
  host.release(high);
  // Equal priority: the earlier claim (low) resumes before the later one.
  assert.deepEqual(log, ["revoke:media/low", "grant:media/low"]);
  assert.equal(host.isGranted(later), false);
  host.release(low);
  assert.deepEqual(log.at(-1), "grant:media/later");
  host.release(later);
});

test("arbitration: multi-channel claims are all-or-none", () => {
  const element = el();
  const host = getMotionHost(element);
  const owner = claim("media/owner", ["filter"], 3);
  const both = claim("media/both", ["filter", "clip-path"], 1);
  host.request(owner, "silent");
  assert.equal(host.request(both, "silent"), false);
  const info = getMotionDebugInfo(element).channels;
  assert.equal(info.find((c) => c.channel === "clip-path").owner, undefined, "no partial grant");
  host.release(owner);
  assert.equal(host.isGranted(both), true);
  host.release(both);
});

test("conflict policies: error throws and records nothing; silent arbitrates without warnings", () => {
  const element = el();
  const host = getMotionHost(element);
  const a = claim("media/a", ["mask"]);
  host.request(a, "silent");
  const b = claim("media/b", ["mask"]);
  assert.throws(() => host.request(b, "error"), NeshelAnimationsError);
  assert.equal(host.isGranted(b), false);
  assert.equal(
    getMotionDebugInfo(element).channels.find((c) => c.channel === "mask").waiting.length,
    0,
  );
  const warnings = captureWarnings(() => host.request(claim("media/c", ["mask"]), "silent"));
  assert.deepEqual(warnings, []);
  assert.throws(() => resolveConflictPolicy("loud"), NeshelAnimationsError);
});

test("default policy: warn in development, silent in production", () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    assert.equal(resolveConflictPolicy(undefined), "silent");
    process.env.NODE_ENV = "development";
    assert.equal(resolveConflictPolicy(undefined), "warn");
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test("commit adopts the end state as the baseline: release keeps it", () => {
  const element = el();
  element.style.filter = "blur(1px)";
  const host = getMotionHost(element);
  const a = claim("media/a", ["filter"]);
  host.request(a, "silent");
  host.commit("filter", "sepia(1)");
  host.release(a);
  frames.flush();
  assert.equal(element.style.filter, "sepia(1)");
});
