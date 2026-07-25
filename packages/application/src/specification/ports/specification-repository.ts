import { Repository } from "../../shared/index.js";

import { Specification, SpecificationId } from "@your-harness/domain";

/**
 * Specification repository contract.
 */
export interface SpecificationRepository extends Repository<
  Specification,
  SpecificationId
> {}
