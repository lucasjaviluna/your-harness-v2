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
import {
  ExecuteStoredWorkItemUseCase,
  InMemoryRepository,
  type ExecutionRequest,
  type RuntimePort,
} from "@your-harness/application";

class FakeRuntimePort implements RuntimePort {
  receivedRequest: ExecutionRequest | undefined;

  async execute(request: ExecutionRequest) {
    this.receivedRequest = request;

    return {
      status: "completed" as const,
      summary: "Fake runtime completed the work item.",
      runtimeSessionId: "fake-runtime-session",
      timestamps: {
        startedAt: "2026-09-13T00:00:00.000Z",
        completedAt: "2026-09-13T00:00:01.000Z",
      },
    };
  }
}

describe("Engineering Core smoke flow", () => {
  it("projects an approved Specification and executes a stored WorkItem through RuntimePort", async () => {
    const scenario = new Scenario(
      new ScenarioId("smoke-scenario"),
      new ScenarioCondition("a work item is requested"),
      new ScenarioExpectedBehavior("the runtime receives the approved requirement"),
    );
    const requirement = new Requirement(
      new RequirementId("smoke-requirement"),
      new RequirementName("Runtime execution"),
      new NormativeStatement("The system SHALL execute approved work items."),
      [scenario],
    );
    const specification = new Specification(
      new SpecificationId("smoke-specification"),
      new SpecificationTitle("Engineering Core smoke specification"),
    )
      .addRequirement(requirement)
      .submitForReview()
      .approve();
    const workItem = new WorkItem(
      new WorkItemId("smoke-work-item"),
      new IntentId("smoke-intent"),
      new WorkItemTitle("Execute the Engineering Core smoke flow"),
    );
    const workItems = new InMemoryRepository<WorkItem, WorkItemId>();
    const specifications = new InMemoryRepository<Specification, SpecificationId>();
    const runtime = new FakeRuntimePort();

    await workItems.save(workItem);
    await specifications.save(specification);

    const result = await new ExecuteStoredWorkItemUseCase(
      workItems,
      specifications,
      runtime,
    ).execute({
      workItemId: workItem.id,
      specificationId: specification.id,
      workspace: "/workspace/engineering-core",
      executionConstraints: ["Run the relevant tests"],
    });

    expect(result).toMatchObject({
      status: "completed",
      runtimeSessionId: "fake-runtime-session",
    });
    expect(runtime.receivedRequest).toEqual({
      objective: "Execute the Engineering Core smoke flow",
      workspace: "/workspace/engineering-core",
      engineeringContext: {
        knowledge: [],
        requirements: [
          {
            name: "Runtime execution",
            normativeStatement: "The system SHALL execute approved work items.",
            scenarios: [
              {
                condition: "a work item is requested",
                expectedBehavior: "the runtime receives the approved requirement",
              },
            ],
          },
        ],
        engineeringConstraints: [],
      },
      executionConstraints: ["Run the relevant tests"],
    });
    expect(workItem.status).toBe("todo");
  });
});
