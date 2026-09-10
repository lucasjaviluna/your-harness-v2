import { ValueObject } from "@your-harness/shared";

/**
 * The normative statement of a Requirement.
 *
 * Must express a behavioral obligation using SHALL or MUST language
 * per the project's specification standard (aligned with OpenSpec semantics).
 */
export class NormativeStatement extends ValueObject<string> {
  constructor(value: string) {
    NormativeStatement.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Normative statement cannot be empty.");
    }

    if (normalized.length > 500) {
      throw new Error(
        "Normative statement cannot exceed 500 characters."
      );
    }

    const lower = normalized.toLowerCase();
    if (!lower.includes(" shall ") && !lower.includes(" must ")) {
      throw new Error(
        "Normative statement must contain 'SHALL' or 'MUST' to express a behavioral obligation."
      );
    }
  }
}