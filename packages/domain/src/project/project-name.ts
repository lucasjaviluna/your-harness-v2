import { ValueObject } from "@your-harness/shared";

/**
 * Represents the human-readable name of a Project.
 */
export class ProjectName extends ValueObject<string> {
  constructor(value: string) {
    ProjectName.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Project name cannot be empty.");
    }

    if (normalized.length > 100) {
      throw new Error("Project name cannot exceed 100 characters.");
    }
  }
}
