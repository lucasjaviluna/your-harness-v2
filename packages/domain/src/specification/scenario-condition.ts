import { ValueObject } from "@your-harness/shared";

/**
 * The condition (WHEN) of a Scenario.
 *
 * Describes the preconditions or triggering context under which
 * the expected behavior must be observed.
 */
export class ScenarioCondition extends ValueObject<string> {
  constructor(value: string) {
    ScenarioCondition.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Scenario condition cannot be empty.");
    }

    if (normalized.length > 300) {
      throw new Error(
        "Scenario condition cannot exceed 300 characters."
      );
    }
  }
}