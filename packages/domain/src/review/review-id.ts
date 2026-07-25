import { Identifier } from "@your-harness/shared";

/**
 * Unique identifier of a Review.
 */
export class ReviewId extends Identifier<string> {
  constructor(value: string) {
    super(value);
  }
}
