import { Identifier } from "@your-harness/shared";

/**
 * Unique identifier of an Intent.
 */
export class IntentId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}
