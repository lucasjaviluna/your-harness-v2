import { Repository } from "../../shared/index.js";

import type { Specification, SpecificationId } from "../../../../domain/src/specification/index.js";

/**
 * Specification repository contract.
 */
export interface SpecificationRepository extends Repository<
  Specification,
  SpecificationId
> {}
