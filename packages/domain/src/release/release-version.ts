import { ValueObject } from "@your-harness/shared";

/**
 * Semantic version of a Release.
 */
export class ReleaseVersion extends ValueObject<string> {
  constructor(value: string) {
    ReleaseVersion.validate(value);

    super(value.trim());
  }

  private static validate(value: string): void {
    const normalized = value.trim();

    if (normalized.length === 0) {
      throw new Error("Release version cannot be empty.");
    }

    const semver =
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

    if (!semver.test(normalized)) {
      throw new Error(
        "Release version must follow Semantic Versioning."
      );
    }
  }
}
