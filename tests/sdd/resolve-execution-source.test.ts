import { describe, expect, it } from "vitest";

import { evaluateSddDrift } from "@your-harness/application";
import type { SddProjectProjection } from "@your-harness/application";
import { assertSpecificationSnapshotMatchesBinding, resolveExecutionSource } from "../../src/sdd/index.js";

const project: SddProjectProjection = {
  providerId: "test-sdd",
  scope: { root: "/workspace" },
  specifications: [{
    id: "authentication",
    title: "Authentication",
    contentDigest: "test-digest",
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
    version: "1",
    contentDigest: "change-digest",
    status: "unknown",
    provenance: { providerId: "test-sdd", reference: "changes/add-login/proposal.md" },
    artifacts: [],
    tasks: [{
      id: "task-1",
      title: "Implement login",
      completed: false,
      status: "pending",
      provenance: { providerId: "test-sdd", reference: "changes/add-login/tasks.md#task-1" },
    }],
  }],
};

describe("resolveExecutionSource", () => {
  it("returns an explicit report when the approved digest matches", () => {
    const source = resolveExecutionSource(project, {
      workItemId: "work-1",
      specificationId: "authentication",
      specificationApproved: true,
      specificationSnapshotDigest: "test-digest",
      taskIds: [],
    });

    expect(evaluateSddDrift({
      approvedDigest: "test-digest",
      currentSnapshot: source.specificationSnapshot,
    })).toEqual(expect.objectContaining({ hasDrift: false, reason: "match" }));
  });

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

  it("rejects a specification whose projection changed after binding", () => {
    const source = resolveExecutionSource(project, {
      workItemId: "work-1",
      specificationId: "authentication",
      specificationApproved: true,
      specificationSnapshotDigest: "approved-digest",
      taskIds: [],
    });

    expect(() => assertSpecificationSnapshotMatchesBinding(
      {
        workItemId: "work-1",
        specificationId: "authentication",
        specificationApproved: true,
        specificationSnapshotDigest: "approved-digest",
        taskIds: [],
      },
      source.specificationSnapshot,
    )).toThrow("changed since binding");
  });

  it("requires a digest so legacy bindings cannot bypass the drift guard", () => {
    const source = resolveExecutionSource(project, {
      workItemId: "work-1",
      specificationId: "authentication",
      specificationApproved: true,
      taskIds: [],
    });

    expect(() => assertSpecificationSnapshotMatchesBinding(
      {
        workItemId: "work-1",
        specificationId: "authentication",
        specificationApproved: true,
        taskIds: [],
      },
      source.specificationSnapshot,
    )).toThrow("rebind the WorkItem");
  });
});
