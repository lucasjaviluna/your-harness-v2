import { createChangeDraftHandoff, type ChangeDraftHandoff } from "./change-draft-handoff.js";
import type { ChangeDraftHandoffRepository } from "./change-draft-handoff-repository.js";

/** Crea un snapshot revisable sin escribir artefactos del proveedor SDD. */
export class CreateChangeDraftHandoffUseCase {
  constructor(private readonly handoffs: ChangeDraftHandoffRepository) {}

  async execute(input: Omit<ChangeDraftHandoff, "status">): Promise<ChangeDraftHandoff> {
    const current = await this.handoffs.findCurrentByChangeId(input.changeId);
    if (current && input.supersedesHandoffId !== current.id) {
      throw new Error(`Change '${input.changeId}' has a current handoff; supersedesHandoffId must reference '${current.id}'.`);
    }
    const handoff = createChangeDraftHandoff({ ...input, status: "ready-for-review" });
    await this.handoffs.save(handoff);
    return handoff;
  }
}
