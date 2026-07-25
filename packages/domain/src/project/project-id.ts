import { Identifier } from "@your-harness/shared";

/**
 * Unique identifier of a Project.
 */
export class ProjectId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}
