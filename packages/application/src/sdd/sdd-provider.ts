import { SddChangeStatus, SddTaskStatus } from "./sdd-lifecycle-status.js";

/** Identidad opaca de un artefacto propiedad de un proveedor SDD. */
export interface SddProvenance {
  readonly providerId: string;
  readonly reference: string;
}

export interface SddScenarioProjection {
  readonly id: string;
  readonly name: string;
  readonly condition: string;
  readonly expectedBehavior: string;
  readonly provenance: SddProvenance;
}

export interface SddRequirementProjection {
  readonly id: string;
  readonly name: string;
  readonly normativeStatement: string;
  readonly scenarios: ReadonlyArray<SddScenarioProjection>;
  readonly provenance: SddProvenance;
}

/** Material de especificación actual, proyectado sin tipos del proveedor. */
export interface SddSpecificationProjection {
  readonly id: string;
  readonly title: string;
  /** Digest estable de esta proyección neutral, calculado por el proveedor. */
  readonly contentDigest: string;
  readonly requirements: ReadonlyArray<SddRequirementProjection>;
  readonly provenance: SddProvenance;
}

export interface SddTaskProjection {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly status: SddTaskStatus;
  readonly provenance: SddProvenance;
}

export interface SddArtifactReference {
  readonly kind: "proposal" | "design" | "specification-effect" | "tasks";
  readonly provenance: SddProvenance;
}

/** Evolución propuesta; no es un aggregate ni una transición de dominio. */
export interface SddChangeProjection {
  readonly id: string;
  readonly title: string;
  readonly status: SddChangeStatus;
  readonly rationale?: string;
  readonly tasks: ReadonlyArray<SddTaskProjection>;
  readonly artifacts: ReadonlyArray<SddArtifactReference>;
  readonly provenance: SddProvenance;
}

export interface SddProjectScope {
  readonly root: string;
}

export interface SddProjectProjection {
  readonly providerId: string;
  readonly scope: SddProjectScope;
  readonly specifications: ReadonlyArray<SddSpecificationProjection>;
  readonly changes: ReadonlyArray<SddChangeProjection>;
}

/**
 * Application port for reading SDD material.
 *
 * This first contract deliberately has no write, CLI invocation, task
 * synchronization or aggregate-mutation operation.
 */
export interface SddProvider {
  readonly id: string;
  readProject(scope: SddProjectScope): Promise<SddProjectProjection>;
}
