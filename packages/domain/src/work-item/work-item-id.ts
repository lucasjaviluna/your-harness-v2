import { Identifier } from "@your-harness/shared";

/**
 * Unique identifier of a Work Item.
 */
export class WorkItemId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}
