import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PHASE6_ANTI_PATTERN_TITLES,
  runPhase6AntiPatternChecks,
} from "./phase6-anti-patterns";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("phase6 anti-pattern gate", () => {
  it("exposes titles for all five review anti-patterns", () => {
    assert.equal(Object.keys(PHASE6_ANTI_PATTERN_TITLES).length, 5);
  });

  it("passes on the current codebase (hot paths + mutations)", async () => {
    const result = await runPhase6AntiPatternChecks(root);
    if (!result.ok) {
      console.error(JSON.stringify(result.findings, null, 2));
    }
    assert.equal(result.ok, true);
    assert.equal(result.checks.length, 5);
    for (const check of result.checks) {
      assert.equal(check.ok, true, check.id);
    }
  });
});
