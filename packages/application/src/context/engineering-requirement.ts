import type { EngineeringScenario } from "./engineering-scenario.js";

/**
 * Neutral representation of a normative engineering requirement.
 *
 * Domain Requirement entities are intentionally not exposed through the
 * Runtime Boundary.
 */
export interface EngineeringRequirement {
  readonly name: string;
  readonly normativeStatement: string;
  readonly scenarios: ReadonlyArray<EngineeringScenario>;
}