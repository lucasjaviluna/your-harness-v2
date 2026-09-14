import type { GovernedChangeRecord } from "./governed-change.js";

export interface GovernedChangeRepository {
  save(record: GovernedChangeRecord): Promise<void>;
  findCurrentByChangeId(changeId: string): Promise<GovernedChangeRecord | undefined>;
  findByChangeId(changeId: string): Promise<ReadonlyArray<GovernedChangeRecord>>;
}
