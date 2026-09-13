export type CompletionAuthorizationDecision =
  | "authorize-completion"
  | "request-rework"
  | "require-further-review";

/** Decisión operacional explícita; no es un estado del WorkItem. */
export interface CompletionAuthorization {
  readonly id: string;
  readonly workItemId: string;
  readonly verificationReportId: string;
  readonly executionTraceId: string;
  readonly decision: CompletionAuthorizationDecision;
  readonly authorizedBy: string;
  readonly reason: string;
  readonly authorizedAt: string;
}

const nonEmpty = (value: string, field: string): void => {
  if (!value.trim()) throw new Error(`CompletionAuthorization ${field} cannot be empty.`);
};

export const createCompletionAuthorization = (
  input: CompletionAuthorization,
): CompletionAuthorization => {
  nonEmpty(input.id, "id");
  nonEmpty(input.workItemId, "work item id");
  nonEmpty(input.verificationReportId, "verification report id");
  nonEmpty(input.executionTraceId, "execution trace id");
  nonEmpty(input.authorizedBy, "authorizedBy");
  nonEmpty(input.reason, "reason");
  nonEmpty(input.authorizedAt, "authorizedAt");
  return { ...input };
};
