import { Repository } from "../../shared/index.js";

import { Release, ReleaseId } from "@your-harness/domain";

/**
 * Release repository contract.
 */
export interface ReleaseRepository extends Repository<Release, ReleaseId> {}
