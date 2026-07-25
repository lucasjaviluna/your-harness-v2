import { ValueObject } from "@your-harness/shared";

/**
 * Human-readable title of a Work Item.
 */
export class WorkItemTitle extends ValueObject<string> {
  constructor(value: string) {
    WorkItemTitle.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Work Item title cannot be empty.");
    }

    if (normalized.length > 150) {
      throw new Error("Work Item title cannot exceed 150 characters.");
    }
  }
}
