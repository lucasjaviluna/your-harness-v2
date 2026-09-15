import { describe, expect, it } from "vitest";

import { evaluateChangeApplyTransition } from "@your-harness/application";

describe("change apply policy", () => {
  it("permite el flujo normal hasta materialized", () => {
    let current: "approved" | "apply-ready" | "applying" | "materialized" = "approved";
    for (const requested of ["apply-ready", "applying", "materialized"] as const) {
      const evaluation = evaluateChangeApplyTransition({ currentStatus: current, requestedStatus: requested });
      expect(evaluation.allowed).toBe(true);
      current = requested;
    }
  });

  it("sólo permite retry desde apply-failed y nunca desde materialized", () => {
    expect(evaluateChangeApplyTransition({ currentStatus: "applying", requestedStatus: "apply-failed" }).allowed).toBe(true);
    expect(evaluateChangeApplyTransition({ currentStatus: "apply-failed", requestedStatus: "applying" }).allowed).toBe(true);
    expect(evaluateChangeApplyTransition({ currentStatus: "materialized", requestedStatus: "applying" }).allowed).toBe(false);
  });
});
