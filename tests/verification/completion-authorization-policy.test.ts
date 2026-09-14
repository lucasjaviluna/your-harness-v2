import { describe, expect, it } from "vitest";
import { createCompletionAuthorizationPolicy } from "@your-harness/application";

describe("CompletionAuthorizationPolicy", () => {
  it("allows a reviewer to authorize verified completion", () => {
    const policy = createCompletionAuthorizationPolicy();

    expect(() => policy.authorize({
      actor: "human-reviewer",
      role: "reviewer",
      decision: "authorize-completion",
    })).not.toThrow();
  });

  it("prevents an engineer from authorizing completion", () => {
    const policy = createCompletionAuthorizationPolicy();

    expect(() => policy.authorize({
      actor: "engineer-1",
      role: "engineer",
      decision: "authorize-completion",
    })).toThrow("not allowed");
  });

  it("rejects unknown roles and blank identities", () => {
    const policy = createCompletionAuthorizationPolicy();

    expect(() => policy.authorize({
      actor: "reviewer",
      role: "unknown" as "reviewer",
      decision: "request-rework",
    })).toThrow("not recognized");
    expect(() => policy.authorize({
      actor: " ",
      role: "reviewer",
      decision: "request-rework",
    })).toThrow("actor cannot be empty");
  });
});
