import type { ChangeStageApproval } from "./change-stage-approval.js";
import { createChangeStageApprovalPolicy } from "./change-stage-approval-policy.js";
import type { SddMaterializationResult, SddMaterializer, SddDraftChangePreview } from "./sdd-materializer.js";

/** Materializa únicamente un preview cuyo Apply Readiness fue aprobado por HITM. */
export class MaterializeApprovedChangeUseCase {
  constructor(
    private readonly materializer: SddMaterializer,
    private readonly policy = createChangeStageApprovalPolicy(),
  ) {}

  async execute(
    preview: SddDraftChangePreview,
    approvals: ReadonlyArray<ChangeStageApproval>,
  ): Promise<SddMaterializationResult> {
    const evaluation = this.policy.evaluate({
      changeId: preview.changeId,
      stage: "apply-readiness",
      changeVersion: preview.version,
      changeDigest: preview.contentDigest,
      approvals,
    });
    if (!evaluation.allowed) {
      throw new Error(`Change '${preview.changeId}' cannot be materialized: ${evaluation.reasons.join(" ")}`);
    }
    return this.materializer.materializeApprovedChange(preview);
  }
}
