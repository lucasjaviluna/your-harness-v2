import type { ChangeDraftHandoff } from "./change-draft-handoff.js";

export interface ChangeDraftHandoffRepository {
  save(handoff: ChangeDraftHandoff): Promise<void>;
  findById(id: string): Promise<ChangeDraftHandoff | null>;
  findByChangeId(changeId: string): Promise<ReadonlyArray<ChangeDraftHandoff>>;
  findCurrentByChangeId(changeId: string): Promise<ChangeDraftHandoff | undefined>;
}
