/**
 * Neutral representation of a Requirement Scenario for execution context.
 *
 * It preserves the WHAT of the behavior without exposing Domain entities.
 */
export interface EngineeringScenario {
  readonly condition: string;
  readonly expectedBehavior: string;
}