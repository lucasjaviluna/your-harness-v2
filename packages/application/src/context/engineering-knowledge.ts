/**
 * Supporting engineering knowledge made available to a runtime execution.
 *
 * This is contextual information, not an authoritative Domain aggregate.
 */
export interface EngineeringKnowledge {
  readonly title: string;
  readonly content: string;
}