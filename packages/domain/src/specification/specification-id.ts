import { Identifier } from "@your-harness/shared";

/**
 * Unique identifier of a Specification.
 */
export class SpecificationId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}
