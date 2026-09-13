import { describe, expect, it } from "vitest";

import {
  ExecuteStoredWorkItemUseCase,
  InMemoryExecutionTraceRepository,
  InMemoryRepository,
} from "@your-harness/application";
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
import type { ExecutionRequest, RuntimePort } from "@your-harness/application";

const createApprovedSpecification = (): Specification => {
  const requirement = new Requirement(
    new RequirementId("requirement-trace"),
    new RequirementName("Record execution trace"),
    new NormativeStatement("The system SHALL retain operational traceability."),
    [
      new Scenario(
        new ScenarioId("scenario-trace"),
        new ScenarioCondition("an execution is requested"),
        new ScenarioExpectedBehavior("the trace is retained"),
      ),
    ],
  );
  return new Specification(
    new SpecificationId("specification-trace"),
    new SpecificationTitle("Traceability"),
  )
    .addRequirement(requirement)
    .submitForReview()
    .approve();
};

describe("ExecutionTrace", () => {
  it("links Change, Specification, WorkItem and RuntimeResult without leaking provenance", async () => {
    const workItem = new WorkItem(
      new WorkItemId("work-item-trace"),
      new IntentId("intent-trace"),
      new WorkItemTitle("Retain execution trace"),
    );
    const specification = createApprovedSpecification();
    const workItems = new InMemoryRepository<WorkItem, WorkItemId>();
    const specifications = new InMemoryRepository<Specification, SpecificationId>();
    const traces = new InMemoryExecutionTraceRepository();
    let receivedRequest: ExecutionRequest | undefined;
    const runtime: RuntimePort = {
      execute: async (request) => {
        receivedRequest = request;
        return {
          status: "completed",
          summary: "Execution completed.",
          runtimeSessionId: "runtime-session-trace",
          timestamps: { startedAt: "2026-09-13T00:00:00.000Z" },
        };
      },
    };
    await workItems.save(workItem);
    await specifications.save(specification);

    const useCase = new ExecuteStoredWorkItemUseCase(
      workItems,
      specifications,
      runtime,
      undefined,
      traces,
    );
    await useCase.execute({
      workItemId: workItem.id,
      specificationId: specification.id,
      workspace: ".",
      trace: {
        id: "trace-001",
        runtimeId: "fake",
        change: {
          id: "add-operational-traceability",
          provenance: {
            providerId: "openspec",
            reference: "openspec/changes/add-operational-traceability",
          },
        },
        taskReferences: [
          {
            providerId: "openspec",
            reference: "openspec/changes/add-operational-traceability/tasks.md#1",
          },
        ],
      },
    });

    await expect(traces.findById("trace-001")).resolves.toMatchObject({
      workItemId: "work-item-trace",
      specificationId: "specification-trace",
      change: { id: "add-operational-traceability" },
      taskReferences: [
        { reference: "openspec/changes/add-operational-traceability/tasks.md#1" },
      ],
      runtimeId: "fake",
      runtimeResult: { runtimeSessionId: "runtime-session-trace" },
    });
    expect(receivedRequest).not.toHaveProperty("change");
    expect(receivedRequest).not.toHaveProperty("taskReferences");
  });

  it("requires a repository when a trace is requested", async () => {
    const workItem = new WorkItem(
      new WorkItemId("work-item-without-trace-repository"),
      new IntentId("intent-without-trace-repository"),
      new WorkItemTitle("Reject missing trace repository"),
    );
    const specification = createApprovedSpecification();
    const workItems = new InMemoryRepository<WorkItem, WorkItemId>();
    const specifications = new InMemoryRepository<Specification, SpecificationId>();
    await workItems.save(workItem);
    await specifications.save(specification);

    const useCase = new ExecuteStoredWorkItemUseCase(workItems, specifications, {
      execute: async () => ({
        status: "completed",
        summary: "done",
        timestamps: { startedAt: "now" },
      }),
    });

    await expect(
      useCase.execute({
        workItemId: workItem.id,
        specificationId: specification.id,
        workspace: ".",
        trace: { id: "trace-missing-repository", runtimeId: "fake" },
      }),
    ).rejects.toThrow("no trace repository is configured");
  });
});
