import type { EngineeringKnowledge } from "./engineering-knowledge.js";
import type { EngineeringRequirement } from "./engineering-requirement.js";

/**
 * Execution-specific engineering knowledge selected by the Application layer.
 *
 * EngineeringContext describes WHAT the runtime needs to know. It does not
 * contain prompts, runtime instructions, RAG implementation details, or
 * Domain aggregates.
 */
export interface EngineeringContext {
  readonly knowledge: ReadonlyArray<EngineeringKnowledge>;
  readonly requirements: ReadonlyArray<EngineeringRequirement>;
  readonly engineeringConstraints: ReadonlyArray<string>;
}