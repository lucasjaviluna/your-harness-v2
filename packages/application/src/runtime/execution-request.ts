/**
 * Request sent from the Application layer to the Runtime Boundary.
 *
 * This contract intentionally contains application-level execution data only.
 * It must not expose Domain aggregates or runtime-specific types.
 */
export interface ExecutionRequest {
  readonly objective: string;
  readonly workspace: string;
  readonly engineeringContext: Readonly<Record<string, unknown>>;
  readonly executionConstraints: Readonly<Record<string, unknown>>;
}
