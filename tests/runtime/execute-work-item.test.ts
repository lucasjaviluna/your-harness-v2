import { describe, expect, it } from "vitest";

import {
  IntentId,
  NormativeStatement,
  Requirement,
  RequirementId,
  RequirementName,
  Scenario,
  ScenarioCondition,
  ScenarioExpectedBehavior,
  ScenarioId,
  Specification,
  SpecificationId,
  SpecificationTitle,
  WorkItem,
  WorkItemId,
  WorkItemTitle,
} from "@your-harness/domain";
import { ExecuteWorkItemUseCase } from "@your-harness/application";

import { FakeRuntimeAdapter } from "./fake-runtime.js";

const createApprovedSpecification = (): Specification => {
  const scenario = new Scenario(
    new ScenarioId("runtime-scenario"),
    new ScenarioCondition("the WorkItem is ready"),
    new ScenarioExpectedBehavior("the RuntimePort receives engineering context"),
  );
  const requirement = new Requirement(
    new RequirementId("runtime-requirement"),
    new RequirementName("Runtime boundary"),
    new NormativeStatement("The system SHALL preserve the approved requirement."),
    [scenario],
  );

  return new Specification(
    new SpecificationId("runtime-specification"),
    new SpecificationTitle("Runtime Boundary Validation"),
  )
    .addRequirement(requirement)
    .submitForReview()
    .approve();
};

describe("Runtime Boundary Validation", () => {
  it("executes an approved WorkItem through a FakeRuntimeAdapter", async () => {
    const runtime = new FakeRuntimeAdapter();
    const workItem = new WorkItem(
      new WorkItemId("runtime-work-item"),
      new IntentId("runtime-intent"),
      new WorkItemTitle("Validate the runtime boundary"),
    );

    const result = await new ExecuteWorkItemUseCase(runtime).execute({
      workItem,
      specification: createApprovedSpecification(),
      workspace: "/workspace/runtime-boundary",
      engineeringConstraints: ["Preserve approved requirements"],
      executionConstraints: ["Run boundary tests"],
    });

    expect(result).toMatchObject({
      status: "completed",
      runtimeSessionId: "fake-runtime-session",
    });
    expect(runtime.requests).toHaveLength(1);
    expect(runtime.requests[0]).toEqual({
      objective: "Validate the runtime boundary",
      workspace: "/workspace/runtime-boundary",
      engineeringContext: {
        knowledge: [],
        requirements: [
          {
            name: "Runtime boundary",
            normativeStatement: "The system SHALL preserve the approved requirement.",
            scenarios: [
              {
                condition: "the WorkItem is ready",
                expectedBehavior: "the RuntimePort receives engineering context",
              },
            ],
          },
        ],
        engineeringConstraints: ["Preserve approved requirements"],
      },
      executionConstraints: ["Run boundary tests"],
    });
    expect(workItem.status).toBe("todo");
  });
});
