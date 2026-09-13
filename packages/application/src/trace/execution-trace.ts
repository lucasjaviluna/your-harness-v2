import type { RuntimeResult } from "../runtime/runtime-result.js";
import type { SddProvenance } from "../sdd/sdd-provider.js";

export interface SddChangeReference {
  readonly id: string;
  readonly provenance: SddProvenance;
}

/** Identidad de la revisión SDD proyectada para una ejecución concreta. */
export interface SddSpecificationSnapshot {
  readonly id: string;
  readonly title: string;
  readonly provenance: SddProvenance;
  /** Digest de la proyección neutral, no del archivo físico del proveedor. */
  readonly contentDigest: string;
  readonly requirementIds: ReadonlyArray<string>;
}

/**
 * Registro operacional que enlaza material SDD, aggregates y resultado de runtime.
 * No pertenece al Domain ni cruza el Runtime Boundary.
 */
export interface ExecutionTrace {
  readonly id: string;
  readonly workItemId: string;
  readonly specificationId: string;
  readonly specificationSnapshot?: SddSpecificationSnapshot;
  readonly change?: SddChangeReference;
  readonly taskReferences: ReadonlyArray<SddProvenance>;
  readonly runtimeId: string;
  readonly runtimeResult: RuntimeResult;
  readonly recordedAt: string;
}
