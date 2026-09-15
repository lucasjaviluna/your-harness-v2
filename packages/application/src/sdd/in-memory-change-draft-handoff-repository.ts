import type { ChangeDraftHandoff } from "./change-draft-handoff.js";
import type { ChangeDraftHandoffRepository } from "./change-draft-handoff-repository.js";

export class InMemoryChangeDraftHandoffRepository implements ChangeDraftHandoffRepository {
  readonly #entries = new Map<string, ChangeDraftHandoff>();

  async save(handoff: ChangeDraftHandoff): Promise<void> {
    if (this.#entries.has(handoff.id)) throw new Error(`ChangeDraftHandoff '${handoff.id}' already exists and is immutable.`);
    this.#entries.set(handoff.id, handoff);
  }

  async findById(id: string): Promise<ChangeDraftHandoff | null> {
    return this.#entries.get(id) ?? null;
  }

  async findByChangeId(changeId: string): Promise<ReadonlyArray<ChangeDraftHandoff>> {
    return [...this.#entries.values()]
      .filter((entry) => entry.changeId === changeId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async findCurrentByChangeId(changeId: string): Promise<ChangeDraftHandoff | undefined> {
    const entries = await this.findByChangeId(changeId);
    return entries.at(-1);
  }
}
