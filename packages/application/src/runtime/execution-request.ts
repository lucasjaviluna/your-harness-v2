import type { EngineeringContext } from "../context/index.js";

/**
 * Request sent from the Application layer to the Runtime Boundary.
 *
 * This contract intentionally contains application-level execution data only.
 * It must not expose Domain aggregates or runtime-specific types.
 */
export interface ExecutionRequest {
  /**
   * What the runtime is being asked to accomplish.
   */
  readonly objective: string;

  /**
   * Workspace in which the execution takes place.
   *
   * The runtime may map this to its own working-directory concept.
   */
  readonly workspace: string;

  /**
   * Contextualized engineering knowledge selected by the Application layer.
   */
  readonly engineeringContext: EngineeringContext;

  /**
   * Constraints that apply to runtime execution.
   *
   * These are execution constraints, not Engineering Core governance rules.
   */
  readonly executionConstraints: ReadonlyArray<string>;
}