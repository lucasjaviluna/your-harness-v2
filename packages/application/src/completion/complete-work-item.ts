import type { WorkItemId } from "@your-harness/domain";
import { WorkItemStatus } from "@your-harness/domain";

import type { ExecutionTraceRepository } from "../trace/execution-trace-repository.js";
import type { VerificationReportRepository } from "../verification/verification-repositories.js";
import { createCompletionAuthorization, type CompletionAuthorization } from "./completion-authorization.js";
import type { CompletionAuthorizationRepository } from "./completion-authorization-repository.js";
import type { WorkItemRepository } from "../work-item/ports/work-item-repository.js";

export interface CompleteWorkItemInput {
  readonly workItemId: WorkItemId;
  readonly authorization: CompletionAuthorization;
}

/** Aplica una decisión explícita y es el único caso de uso que completa WorkItem. */
export class CompleteWorkItemUseCase {
  constructor(
    private readonly workItems: WorkItemRepository,
    private readonly traces: ExecutionTraceRepository,
    private readonly reports: VerificationReportRepository,
    private readonly authorizations: CompletionAuthorizationRepository,
  ) {}

  async execute(input: CompleteWorkItemInput): Promise<void> {
    const authorization = createCompletionAuthorization(input.authorization);
    const workItem = await this.workItems.findById(input.workItemId);
    if (!workItem) throw new Error(`Work item '${input.workItemId.value}' not found.`);
    if (authorization.workItemId !== workItem.id.value) {
      throw new Error("Completion authorization does not match the WorkItem.");
    }

    const trace = await this.traces.findById(authorization.executionTraceId);
    if (!trace) throw new Error(`ExecutionTrace '${authorization.executionTraceId}' was not found.`);
    if (trace.workItemId !== workItem.id.value) {
      throw new Error("Completion authorization trace does not belong to the WorkItem.");
    }

    const report = await this.reports.findById(authorization.verificationReportId);
    if (!report) throw new Error(`VerificationReport '${authorization.verificationReportId}' was not found.`);
    if (report.executionTraceId !== trace.id) {
      throw new Error("VerificationReport does not match the authorized ExecutionTrace.");
    }

    if (authorization.decision === "authorize-completion") {
      if (report.outcome !== "verified" && report.outcome !== "requires-human-review") {
        throw new Error(`VerificationReport outcome '${report.outcome}' cannot authorize completion.`);
      }
      if (workItem.status !== WorkItemStatus.InProgress) {
        throw new Error("Only an in-progress WorkItem can be completed.");
      }
      await this.workItems.save(workItem.complete());
    }

    await this.authorizations.save(authorization);
  }
}
