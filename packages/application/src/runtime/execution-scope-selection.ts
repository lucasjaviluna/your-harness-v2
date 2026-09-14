export type ExecutionScopeSelectionRole = "reviewer" | "maintainer" | "owner";

/** Alcance confirmado por una persona; es un registro operacional, no un aggregate. */
export interface ExecutionScopeSelection {
  readonly id: string;
  readonly workItemId: string;
  readonly specificationId: string;
  readonly specificationSnapshotDigest: string;
  readonly requirementIds: ReadonlyArray<string>;
  readonly scenarioIds: ReadonlyArray<string>;
  readonly confirmedBy: string;
  readonly confirmedByRole: ExecutionScopeSelectionRole;
  readonly reason: string;
  readonly confirmedAt: string;
}

export const createExecutionScopeSelection = (input: ExecutionScopeSelection): ExecutionScopeSelection => {
  for (const [field, value] of Object.entries(input)) {
    if (typeof value === "string" && !value.trim()) throw new Error(`ExecutionScopeSelection ${field} cannot be empty.`);
  }
  if (input.requirementIds.length === 0) throw new Error("ExecutionScopeSelection requires at least one requirement.");
  if (!["reviewer", "maintainer", "owner"].includes(input.confirmedByRole)) {
    throw new Error(`ExecutionScopeSelection role '${input.confirmedByRole}' cannot confirm execution scope.`);
  }
  return { ...input, requirementIds: [...input.requirementIds], scenarioIds: [...input.scenarioIds] };
};
