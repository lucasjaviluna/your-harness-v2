import { describe, expect, it } from "vitest";

import { reconcileInterruptedChangeApply } from "@your-harness/application";

describe("reconcile interrupted Change Apply", () => {
  it("clasifica digest final, base e inconsistente", () => {
    expect(reconcileInterruptedChangeApply({ currentStatus: "applying", currentContentDigest: "final", baseContentDigest: "base", expectedContentDigest: "final" }).recommendedStatus).toBe("materialized");
    expect(reconcileInterruptedChangeApply({ currentStatus: "applying", currentContentDigest: "base", baseContentDigest: "base", expectedContentDigest: "final" }).recommendedStatus).toBe("apply-failed");
    expect(reconcileInterruptedChangeApply({ currentStatus: "applying", currentContentDigest: "other", baseContentDigest: "base", expectedContentDigest: "final" }).recommendedStatus).toBe("recovery-required");
  });
});
