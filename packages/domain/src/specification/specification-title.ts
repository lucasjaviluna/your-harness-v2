import { ValueObject } from "@your-harness/shared";

/**
 * Human-readable title of a Specification.
 */
export class SpecificationTitle extends ValueObject<string> {
  constructor(value: string) {
    SpecificationTitle.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Specification title cannot be empty.");
    }

    if (normalized.length > 150) {
      throw new Error(
        "Specification title cannot exceed 150 characters."
      );
    }
  }
}
