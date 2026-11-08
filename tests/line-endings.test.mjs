import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "../scripts/lib/workspace.mjs";

// Research R19: LF everywhere keeps Spec Kit manifest hashes and tarballs identical across OSes.
const git = spawnSync("git", ["ls-files", "--eol"], { cwd: repoRoot, encoding: "utf8" });
const inGitCheckout = git.status === 0 && git.stdout.length > 0;

test(".gitattributes normalizes all text files to LF", () => {
  const attributes = readFileSync(join(repoRoot, ".gitattributes"), "utf8");
  assert.match(attributes, /^\* text=auto eol=lf$/m);
});

test("every tracked text file is stored with LF line endings", {
  skip: inGitCheckout ? false : "not a git checkout",
}, () => {
  const offenders = git.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => ({ index: line.split(/\s+/)[0], path: line.split("\t").pop() }))
    .filter(({ index }) => index !== "i/lf" && index !== "i/-text" && index !== "i/none");
  assert.deepEqual(offenders, [], "files stored with CRLF or mixed line endings");
});
