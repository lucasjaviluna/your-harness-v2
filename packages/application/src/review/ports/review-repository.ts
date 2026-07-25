import { Repository } from "../../shared/index.js";

import { Review, ReviewId } from "@your-harness/domain";

/**
 * Review repository contract.
 */
export interface ReviewRepository extends Repository<Review, ReviewId> {}
