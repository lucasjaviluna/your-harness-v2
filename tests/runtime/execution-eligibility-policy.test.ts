import { describe, expect, it } from "vitest";

import {
  createExecutionEligibilityPolicy,
  ExecuteWorkItemUseCase,
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
import type { RuntimePort } from "@your-harness/application";

const createSpecification = (approved: boolean): Specification => {
  const specification = new Specification(
    new SpecificationId("eligibility-specification"),
    new SpecificationTitle("Eligibility"),
  ).addRequirement(
    new Requirement(
      new RequirementId("eligibility-requirement"),
      new RequirementName("Allow eligible execution"),
      new NormativeStatement("The system SHALL evaluate execution eligibility."),
      [
        new Scenario(
          new ScenarioId("eligibility-scenario"),
          new ScenarioCondition("an execution is requested"),
          new ScenarioExpectedBehavior("the policy returns a decision"),
        ),
      ],
    ),
  );
  return approved ? specification.submitForReview().approve() : specification;
};

describe("ExecutionEligibilityPolicy", () => {
  it("denies a Specification that has not been approved", () => {
    const decision = createExecutionEligibilityPolicy().evaluate({
      specification: createSpecification(false),
    });

    expect(decision).toEqual({
      eligible: false,
      reasons: ["SPECIFICATION_NOT_APPROVED"],
    });
  });

  it("requires Change provenance when SDD traceability is enabled", () => {
    const policy = createExecutionEligibilityPolicy({
      requireSddChangeTraceability: true,
    });

    expect(policy.evaluate({ specification: createSpecification(true) })).toEqual({
      eligible: false,
      reasons: ["SDD_CHANGE_TRACEABILITY_REQUIRED"],
    });
    expect(
      policy.evaluate({
        specification: createSpecification(true),
        traceability: {
          change: {
            id: "add-eligibility-guardrail",
            provenance: {
              providerId: "openspec",
              reference: "openspec/changes/add-eligibility-guardrail",
            },
          },
        },
      }),
    ).toEqual({ eligible: true, reasons: [] });
  });

  it("prevents the runtime call before an ineligible request is assembled", async () => {
    let executions = 0;
    const runtime: RuntimePort = {
      execute: async () => {
        executions += 1;
        return {
          status: "completed",
          summary: "unexpected",
          timestamps: { startedAt: "now" },
        };
      },
    };
    const useCase = new ExecuteWorkItemUseCase(
      runtime,
      undefined,
      createExecutionEligibilityPolicy({ requireSddChangeTraceability: true }),
    );
    const workItem = new WorkItem(
      new WorkItemId("eligibility-work-item"),
      new IntentId("eligibility-intent"),
      new WorkItemTitle("Evaluate execution eligibility"),
    );

    await expect(
      useCase.execute({
        workItem,
        specification: createSpecification(true),
        workspace: ".",
      }),
    ).rejects.toThrow("SDD_CHANGE_TRACEABILITY_REQUIRED");
    expect(executions).toBe(0);
  });
});
