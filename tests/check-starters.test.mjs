import assert from "node:assert/strict";
import test from "node:test";
import { satisfiesCaret } from "../scripts/check-starters.mjs";

test("satisfiesCaret follows caret semantics, with a fixed minor for 0.x", () => {
  const cases = [
    ["0.1.0", "^0.1.0", true],
    ["0.1.5", "^0.1.0", true],
    ["0.2.0", "^0.1.0", false],
    ["0.0.9", "^0.1.0", false],
    ["1.4.0", "^1.2.3", true],
    ["1.2.2", "^1.2.3", false],
    ["2.0.0", "^1.2.3", false],
    ["missing", "^0.1.0", false],
    ["0.1.0", "0.1.0", false],
    ["0.1.0", "file:../neshel-ui-config-0.1.0.tgz", false],
  ];
  for (const [version, range, expected] of cases) {
    assert.equal(satisfiesCaret(version, range), expected, `${version} vs ${range}`);
  }
});
