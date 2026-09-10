import { Identifier } from "@your-harness/shared";

/**
 * Unique identifier of a Scenario.
 */
export class ScenarioId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}