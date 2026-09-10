import { ValueObject } from "@your-harness/shared";

/**
 * Human-readable name of a Requirement.
 */
export class RequirementName extends ValueObject<string> {
  constructor(value: string) {
    RequirementName.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Requirement name cannot be empty.");
    }

    if (normalized.length > 120) {
      throw new Error(
        "Requirement name cannot exceed 120 characters."
      );
    }
  }
}