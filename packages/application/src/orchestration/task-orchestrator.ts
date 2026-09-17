import { SpecificationStatus, WorkItemStatus } from "@your-harness/domain";

import type { RuntimeResult } from "../runtime/runtime-result.js";
import type { ChangeStage, ChangeStageApproval } from "../sdd/change-stage-approval.js";
import type { VerificationOutcome } from "../verification/verification-report.js";

const approvalStages: ReadonlyArray<ChangeStage> = [
  "proposal",
  "design",
  "task-plan",
  "apply-readiness",
];

/** Datos observables que el adaptador reúne para calcular un plan, sin modificarlos. */
export interface TaskOrchestrationSnapshot {
  readonly workItem: {
    readonly id: string;
    readonly status: WorkItemStatus;
  };
  readonly specification?: {
    readonly id: string;
    readonly status: SpecificationStatus;
  };
  readonly change?: {
    readonly id: string;
    readonly version: string;
    readonly digest: string;
    readonly approvals: ReadonlyArray<ChangeStageApproval>;
    /** El caller debe obtenerlo de la auditoría/materialización durable. */
    readonly materialization: "not-materialized" | "materialized" | "recovery-required";
  };
  readonly execution?: {
    readonly traceId: string;
    readonly status: RuntimeResult["status"];
  };
  readonly verification?: {
    readonly executionTraceId: string;
    readonly outcome: VerificationOutcome;
  };
}

export type TaskOrchestrationPhase =
  | "needs-context"
  | "awaiting-approval"
  | "ready-for-apply"
  | "ready-for-execution"
  | "awaiting-verification"
  | "ready-for-completion"
  | "blocked"
  | "completed";

export type TaskOrchestrationAction =
  | { readonly kind: "approve-change-stage"; readonly stage: ChangeStage }
  | { readonly kind: "apply-change" }
  | { readonly kind: "execute-work-item" }
  | { readonly kind: "record-evidence-and-verify"; readonly executionTraceId: string }
  | { readonly kind: "authorize-completion"; readonly executionTraceId: string };

export interface TaskOrchestrationBlocker {
  readonly code:
    | "SPECIFICATION_MISSING"
    | "SPECIFICATION_NOT_APPROVED"
    | "CHANGE_MISSING"
    | "CHANGE_REQUIRES_RECOVERY"
    | "WORK_ITEM_NOT_EXECUTABLE"
    | "EXECUTION_REQUIRES_INVESTIGATION"
    | "VERIFICATION_NOT_SUFFICIENT";
  readonly message: string;
}

export interface TaskOrchestrationPlan {
  readonly workItemId: string;
  readonly phase: TaskOrchestrationPhase;
  readonly actions: ReadonlyArray<TaskOrchestrationAction>;
  readonly blockers: ReadonlyArray<TaskOrchestrationBlocker>;
}

const plan = (
  snapshot: TaskOrchestrationSnapshot,
  phase: TaskOrchestrationPhase,
  actions: ReadonlyArray<TaskOrchestrationAction> = [],
  blockers: ReadonlyArray<TaskOrchestrationBlocker> = [],
): TaskOrchestrationPlan => ({ workItemId: snapshot.workItem.id, phase, actions, blockers });

const currentApproval = (
  approvals: ReadonlyArray<ChangeStageApproval>,
  changeId: string,
  version: string,
  digest: string,
  stage: ChangeStage,
): ChangeStageApproval | undefined => approvals.find((approval) => approval.changeId === changeId
  && approval.stage === stage
  && approval.changeVersion === version
  && approval.changeDigest === digest);

/**
 * Calcula el próximo paso permitido sin invocar providers, runtimes ni repositorios.
 * Los efectos continúan siendo responsabilidad de sus casos de uso gobernados.
 */
export class TaskOrchestrator {
  plan(snapshot: TaskOrchestrationSnapshot): TaskOrchestrationPlan {
    if (snapshot.workItem.status === WorkItemStatus.Done) return plan(snapshot, "completed");
    if (snapshot.workItem.status !== WorkItemStatus.InProgress) {
      return plan(snapshot, "blocked", [], [{
        code: "WORK_ITEM_NOT_EXECUTABLE",
        message: `WorkItem '${snapshot.workItem.id}' must be in-progress before orchestration.`,
      }]);
    }
    if (!snapshot.specification) {
      return plan(snapshot, "needs-context", [], [{
        code: "SPECIFICATION_MISSING",
        message: "An approved Specification is required before execution.",
      }]);
    }
    if (snapshot.specification.status !== SpecificationStatus.Approved) {
      return plan(snapshot, "needs-context", [], [{
        code: "SPECIFICATION_NOT_APPROVED",
        message: `Specification '${snapshot.specification.id}' is not approved.`,
      }]);
    }
    if (!snapshot.change) {
      return plan(snapshot, "needs-context", [], [{
        code: "CHANGE_MISSING",
        message: "A governed Change snapshot is required before execution.",
      }]);
    }

    for (const stage of approvalStages) {
      const approval = currentApproval(
        snapshot.change.approvals,
        snapshot.change.id,
        snapshot.change.version,
        snapshot.change.digest,
        stage,
      );
      if (!approval || approval.decision === "request-rework" || approval.decision === "reject") {
        return plan(snapshot, "awaiting-approval", [{ kind: "approve-change-stage", stage }]);
      }
    }

    if (snapshot.change.materialization === "recovery-required") {
      return plan(snapshot, "blocked", [], [{
        code: "CHANGE_REQUIRES_RECOVERY",
        message: `Change '${snapshot.change.id}' requires explicit HITM recovery.`,
      }]);
    }
    if (snapshot.change.materialization === "not-materialized") {
      return plan(snapshot, "ready-for-apply", [{ kind: "apply-change" }]);
    }

    if (!snapshot.execution) return plan(snapshot, "ready-for-execution", [{ kind: "execute-work-item" }]);
    if (snapshot.execution.status !== "completed") {
      return plan(snapshot, "blocked", [], [{
        code: "EXECUTION_REQUIRES_INVESTIGATION",
        message: `Execution '${snapshot.execution.traceId}' did not complete successfully.`,
      }]);
    }
    if (!snapshot.verification || snapshot.verification.executionTraceId !== snapshot.execution.traceId) {
      return plan(snapshot, "awaiting-verification", [{
        kind: "record-evidence-and-verify",
        executionTraceId: snapshot.execution.traceId,
      }]);
    }
    if (snapshot.verification.outcome === "verified" || snapshot.verification.outcome === "requires-human-review") {
      return plan(snapshot, "ready-for-completion", [{
        kind: "authorize-completion",
        executionTraceId: snapshot.execution.traceId,
      }]);
    }
    return plan(snapshot, "blocked", [], [{
      code: "VERIFICATION_NOT_SUFFICIENT",
      message: `Verification outcome '${snapshot.verification.outcome}' cannot authorize completion.`,
    }]);
  }
}
