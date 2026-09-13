import { Repository } from "../../shared/index.js";

import type { Specification, SpecificationId } from "@your-harness/domain";

/**
 * Specification repository contract.
 */
export interface SpecificationRepository extends Repository<
  Specification,
  SpecificationId
> {}
