import type { SddChangeProjection, SddProjectProjection, SddSpecificationProjection } from "@your-harness/application";
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
  SpecificationStatus,
  SpecificationTitle,
} from "@your-harness/domain";

import type { WorkItemExecutionBinding } from "../persistence/local/index.js";

export interface ResolvedExecutionSource {
  readonly specification: Specification;
  readonly change?: SddChangeProjection;
  readonly taskReferences: ReadonlyArray<{ readonly providerId: string; readonly reference: string }>;
}

const requiredSpecification = (project: SddProjectProjection, id: string): SddSpecificationProjection => {
  const specification = project.specifications.find((item) => item.id === id);
  if (!specification) throw new Error(`Configured SDD specification '${id}' was not found.`);
  return specification;
};

const optionalChange = (project: SddProjectProjection, id: string | undefined): SddChangeProjection | undefined => {
  if (id === undefined) return undefined;
  const change = project.changes.find((item) => item.id === id);
  if (!change) throw new Error(`Configured SDD change '${id}' was not found.`);
  return change;
};

const toApprovedSpecification = (source: SddSpecificationProjection): Specification =>
  new Specification(
    new SpecificationId(source.id),
    new SpecificationTitle(source.title),
    SpecificationStatus.Approved,
    source.requirements.map(
      (requirement) => new Requirement(
        new RequirementId(requirement.id),
        new RequirementName(requirement.name),
        new NormativeStatement(requirement.normativeStatement),
        requirement.scenarios.map((scenario) => new Scenario(
          new ScenarioId(scenario.id),
          new ScenarioCondition(scenario.condition),
          new ScenarioExpectedBehavior(scenario.expectedBehavior),
        )),
      ),
    ),
  );

/** Proyecta la fuente actual; el binding aporta la autorización explícita. */
export const resolveExecutionSource = (
  project: SddProjectProjection,
  binding: WorkItemExecutionBinding,
): ResolvedExecutionSource => {
  if (!binding.specificationApproved) {
    throw new Error(`SDD specification '${binding.specificationId}' is not approved for execution.`);
  }
  const change = optionalChange(project, binding.changeId);
  const taskReferences = binding.taskIds.map((taskId) => {
    if (!change) throw new Error("Execution binding task ids require a configured SDD change.");
    const task = change.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(`Configured SDD task '${taskId}' was not found in Change '${change.id}'.`);
    return task.provenance;
  });

  return {
    specification: toApprovedSpecification(requiredSpecification(project, binding.specificationId)),
    change,
    taskReferences,
  };
};
