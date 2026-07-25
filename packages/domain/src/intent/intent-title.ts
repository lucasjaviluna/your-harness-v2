import { ValueObject } from "@your-harness/shared";

/**
 * Human-readable title of an engineering intent.
 */
export class IntentTitle extends ValueObject<string> {
  constructor(value: string) {
    IntentTitle.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Intent title cannot be empty.");
    }

    if (normalized.length > 150) {
      throw new Error("Intent title cannot exceed 150 characters.");
    }
  }
}
