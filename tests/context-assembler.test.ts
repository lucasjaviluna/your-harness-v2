import { describe, expect, it } from "vitest";

import {
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
} from "../packages/domain/src/index.js";
import { IntentId, WorkItem, WorkItemId, WorkItemTitle } from "../packages/domain/src/index.js";
import { createContextAssembler } from "../packages/application/src/context/index.js";
import { ExecuteWorkItemUseCase } from "../packages/application/src/runtime/index.js";
import { ExecuteStoredWorkItemUseCase } from "../packages/application/src/runtime/index.js";
import { InMemoryRepository } from "../packages/application/src/shared/index.js";

const createSpecification = (approved = true): Specification => {
  const scenario = new Scenario(
    new ScenarioId("scenario-1"),
    new ScenarioCondition("a valid request is received"),
    new ScenarioExpectedBehavior("the request is processed successfully")
  );
  const requirement = new Requirement(
    new RequirementId("requirement-1"),
    new RequirementName("Request processing"),
    new NormativeStatement("The system SHALL process valid requests."),
    [scenario]
  );
  const specification = new Specification(
    new SpecificationId("specification-1"),
    new SpecificationTitle("Request API")
  ).addRequirement(requirement);

  return approved ? specification.submitForReview().approve() : specification;
};

describe("ContextAssembler", () => {
  it("projects an approved Specification into EngineeringContext", () => {
    const context = createContextAssembler().assemble({
      specification: createSpecification(),
      knowledge: [{ title: "API guide", content: "Use JSON responses." }],
      engineeringConstraints: ["No breaking changes"],
    });

    expect(context).toEqual({
      knowledge: [{ title: "API guide", content: "Use JSON responses." }],
      requirements: [
        {
          name: "Request processing",
          normativeStatement: "The system SHALL process valid requests.",
          scenarios: [
            {
              condition: "a valid request is received",
              expectedBehavior: "the request is processed successfully",
            },
          ],
        },
      ],
      engineeringConstraints: ["No breaking changes"],
    });
  });

  it("rejects Specifications that have not been approved", () => {
    expect(() =>
      createContextAssembler().assemble({
        specification: createSpecification(false),
      })
    ).toThrow("Solo las especificaciones aprobadas");
  });

  it("assembles and sends a WorkItem to the runtime without modifying it", async () => {
    let receivedRequest;
    const runtime = {
      execute: async (request: any) => {
        receivedRequest = request;
        return {
          status: "completed" as const,
          summary: "ok",
          timestamps: { startedAt: "now" },
        };
      },
    };
    const workItem = new WorkItem(
      new WorkItemId("work-item-1"),
      new IntentId("intent-1"),
      new WorkItemTitle("Implement request validation")
    );

    const result = await new ExecuteWorkItemUseCase(runtime).execute({
      workItem,
      specification: createSpecification(),
      workspace: "/workspace/project",
      executionConstraints: ["Run tests"],
    });

    expect(result.status).toBe("completed");
    expect(receivedRequest).toMatchObject({
      objective: "Implement request validation",
      workspace: "/workspace/project",
      executionConstraints: ["Run tests"],
    });
    expect(workItem.status).toBe("todo");
  });

  it("loads a WorkItem and Specification from repositories before execution", async () => {
    const workItems = new InMemoryRepository<WorkItem, WorkItemId>();
    const specifications = new InMemoryRepository<Specification, SpecificationId>();
    const workItem = new WorkItem(
      new WorkItemId("stored-work-item"),
      new IntentId("intent-1"),
      new WorkItemTitle("Execute stored work item")
    );
    const specification = createSpecification();
    await workItems.save(workItem);
    await specifications.save(specification);

    const runtime = {
      execute: async () => ({
        status: "completed" as const,
        summary: "stored execution",
        timestamps: { startedAt: "now" },
      }),
    };
    const result = await new ExecuteStoredWorkItemUseCase(
      workItems,
      specifications,
      runtime
    ).execute({
      workItemId: workItem.id,
      specificationId: specification.id,
      workspace: "/workspace/project",
    });

    expect(result.summary).toBe("stored execution");
  });
});
