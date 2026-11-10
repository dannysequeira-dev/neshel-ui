import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");
const publishJob = workflow.slice(workflow.indexOf("\n  publish:"));

test("release workflow publishes through OIDC with no npm credential", () => {
  // Comments may mention history; only the YAML itself must be credential-free.
  const yaml = workflow
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  assert.doesNotMatch(yaml, /NODE_AUTH_TOKEN|NPM_TOKEN|NPM_BOOTSTRAP_TOKEN|secrets\./);
});

test("the publish job keeps the protected environment and id-token permission", () => {
  assert.match(publishJob, /environment: npm-release/);
  assert.match(publishJob, /id-token: write/);
  assert.match(publishJob, /startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.match(workflow, /tags: \["v\*\.\*\.\*"\]/);
});
