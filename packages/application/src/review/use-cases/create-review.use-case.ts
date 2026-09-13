import type { CreateReviewInput } from "./create-review.input.js";
import { Review, ReviewId, SpecificationId } from "@your-harness/domain";

import { UseCase } from "../../shared/index.js";

import type { ReviewRepository } from "../ports/index.js";
import type { CreateReviewOutput } from "./create-review.output.js";

export class CreateReviewUseCase implements UseCase<
  CreateReviewInput,
  CreateReviewOutput
> {
  constructor(private readonly repository: ReviewRepository) {}

  async execute(input: CreateReviewInput): Promise<CreateReviewOutput> {
    const review = new Review(
      new ReviewId(input.id),
      new SpecificationId(input.specificationId),
    );

    await this.repository.save(review);

    return {
      id: review.id.value,
    };
  }
}
