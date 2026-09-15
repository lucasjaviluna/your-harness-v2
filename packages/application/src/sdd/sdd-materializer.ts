import type { SddProjectScope } from "./sdd-provider.js";

export interface SddDraftChangeInput {
  readonly scope: SddProjectScope;
  readonly changeId: string;
  readonly proposal: string;
  readonly design: string;
  readonly tasks: string;
  /** Snapshot requerido para actualizar un Change existente. */
  readonly baseVersion?: string;
  readonly baseContentDigest?: string;
}

export interface SddDraftChangePreview extends SddDraftChangeInput {
  readonly version: string;
  readonly contentDigest: string;
}

export interface SddMaterializationResult {
  readonly changeId: string;
  readonly version: string;
  readonly contentDigest: string;
  readonly references: ReadonlyArray<string>;
}

/** Port de escritura separado del proveedor SDD read-only. */
export interface SddMaterializer {
  previewDraftChange(input: SddDraftChangeInput): Promise<SddDraftChangePreview>;
  materializeApprovedChange(preview: SddDraftChangePreview): Promise<SddMaterializationResult>;
}
