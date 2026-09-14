/** Estado normalizado de una Specification cuando el proveedor puede demostrarlo. */
export enum SddSpecificationStatus {
  Draft = "draft",
  InReview = "in-review",
  Approved = "approved",
  Superseded = "superseded",
  Archived = "archived",
  Unknown = "unknown",
}

/** Estado que el proveedor SDD puede afirmar sobre un Change. */
export enum SddChangeStatus {
  Proposed = "proposed",
  Approved = "approved",
  Executing = "executing",
  VerificationPending = "verification-pending",
  Completed = "completed",
  Withdrawn = "withdrawn",
  Unknown = "unknown",
}

/** Estado mínimo normalizado de una tarea perteneciente a un Change. */
export enum SddTaskStatus {
  Pending = "pending",
  Completed = "completed",
  Unknown = "unknown",
}

/** Estado operacional gobernado por your-harness, independiente del proveedor. */
export enum GovernedChangeStatus {
  Proposed = "proposed",
  Approved = "approved",
  Executing = "executing",
  VerificationPending = "verification-pending",
  Completed = "completed",
  Withdrawn = "withdrawn",
}
