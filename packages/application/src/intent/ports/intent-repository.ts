import {
  Repository
} from "../../shared/index.js";

import {
  Intent,
  IntentId
} from "@your-harness/domain";

/**
 * Intent repository contract.
 */
export interface IntentRepository
  extends Repository<Intent, IntentId> {}
