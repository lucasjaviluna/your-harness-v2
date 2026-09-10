import { ValueObject } from "@your-harness/shared";

/**
 * The expected behavior (THEN) of a Scenario.
 *
 * Describes the observable outcome or system response that
 * must occur when the condition is met.
 */
export class ScenarioExpectedBehavior extends ValueObject<string> {
  constructor(value: string) {
    ScenarioExpectedBehavior.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Scenario expected behavior cannot be empty.");
    }

    if (normalized.length > 500) {
      throw new Error(
        "Scenario expected behavior cannot exceed 500 characters."
      );
    }
  }
}