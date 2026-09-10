import { Identifier } from "@your-harness/shared";

/**
 * Unique identifier of a Requirement.
 */
export class RequirementId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}