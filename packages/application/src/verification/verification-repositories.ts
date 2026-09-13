import type { VerificationPlan } from "./verification-plan.js";
import type { VerificationReport } from "./verification-report.js";

export interface VerificationPlanRepository {
  save(plan: VerificationPlan): Promise<void>;
  findById(id: string): Promise<VerificationPlan | null>;
}

export interface VerificationReportRepository {
  save(report: VerificationReport): Promise<void>;
  findById(id: string): Promise<VerificationReport | null>;
  findByPlanId(planId: string): Promise<ReadonlyArray<VerificationReport>>;
}
