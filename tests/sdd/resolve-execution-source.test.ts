import { describe, expect, it } from "vitest";

import type { SddProjectProjection } from "@your-harness/application";
import { resolveExecutionSource } from "../../src/sdd/index.js";

const project: SddProjectProjection = {
  providerId: "test-sdd",
  scope: { root: "/workspace" },
  specifications: [{
    id: "authentication",
    title: "Authentication",
    provenance: { providerId: "test-sdd", reference: "specs/authentication.md" },
    requirements: [{
      id: "login",
      name: "Login",
      normativeStatement: "The system SHALL authenticate a valid user.",
      provenance: { providerId: "test-sdd", reference: "specs/authentication.md" },
      scenarios: [{
        id: "valid-login",
        name: "Valid login",
        condition: "a valid user submits credentials",
        expectedBehavior: "the user receives an authenticated session",
        provenance: { providerId: "test-sdd", reference: "specs/authentication.md" },
      }],
    }],
  }],
  changes: [{
    id: "add-login",
    title: "Add login",
    provenance: { providerId: "test-sdd", reference: "changes/add-login/proposal.md" },
    artifacts: [],
    tasks: [{
      id: "task-1",
      title: "Implement login",
      completed: false,
      provenance: { providerId: "test-sdd", reference: "changes/add-login/tasks.md#task-1" },
    }],
  }],
};

describe("resolveExecutionSource", () => {
  it("projects an explicitly approved SDD binding with Change/task provenance", () => {
    const source = resolveExecutionSource(project, {
      workItemId: "work-1",
      specificationId: "authentication",
      specificationApproved: true,
      changeId: "add-login",
      taskIds: ["task-1"],
    });

    expect(source.specification.status).toBe("approved");
    expect(source.specification.requirements[0]?.scenarios).toHaveLength(1);
    expect(source.change?.provenance.reference).toBe("changes/add-login/proposal.md");
    expect(source.taskReferences).toEqual([
      { providerId: "test-sdd", reference: "changes/add-login/tasks.md#task-1" },
    ]);
  });

  it("rejects a source that has not been explicitly approved for execution", () => {
    expect(() => resolveExecutionSource(project, {
      workItemId: "work-1",
      specificationId: "authentication",
      specificationApproved: false,
      taskIds: [],
    })).toThrow("is not approved for execution");
  });
});
