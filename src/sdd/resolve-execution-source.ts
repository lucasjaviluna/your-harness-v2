import { evaluateSddDrift } from "@your-harness/application";
import type { SddChangeProjection, SddProjectProjection, SddSpecificationProjection, SddSpecificationSnapshot } from "@your-harness/application";
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
  readonly specificationSnapshot: SddSpecificationSnapshot;
  readonly change?: SddChangeProjection;
  readonly taskReferences: ReadonlyArray<{ readonly providerId: string; readonly reference: string }>;
}

/** Impide ejecutar una proyección SDD distinta de la aprobada al hacer bind. */
export const assertSpecificationSnapshotMatchesBinding = (
  binding: WorkItemExecutionBinding,
  snapshot: SddSpecificationSnapshot,
): void => {
  const report = evaluateSddDrift({
    approvedDigest: binding.specificationSnapshotDigest,
    currentSnapshot: snapshot,
  });
  if (report.reason === "missing-approved-digest") {
    throw new Error(
      `Work item '${binding.workItemId}' has no approved SDD snapshot digest; rebind the WorkItem before execution.`,
    );
  }
  if (report.reason === "digest-mismatch") {
    throw new Error(
      `SDD specification '${binding.specificationId}' changed since binding (approved digest '${binding.specificationSnapshotDigest}', current '${snapshot.contentDigest}'); rebind the WorkItem before execution.`,
    );
  }
};

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

const toSpecificationSnapshot = (source: SddSpecificationProjection): SddSpecificationSnapshot => {
  return {
    id: source.id,
    title: source.title,
    provenance: source.provenance,
    contentDigest: source.contentDigest,
    requirementIds: source.requirements.map((requirement) => requirement.id),
  };
};

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

  const source = requiredSpecification(project, binding.specificationId);
  return {
    specification: toApprovedSpecification(source),
    specificationSnapshot: toSpecificationSnapshot(source),
    change,
    taskReferences,
  };
};
