import type { CompletionAuthorization } from "./completion-authorization.js";
import type { CompletionAuthorizationRepository } from "./completion-authorization-repository.js";

export class InMemoryCompletionAuthorizationRepository implements CompletionAuthorizationRepository {
  readonly #entries = new Map<string, CompletionAuthorization>();

  async save(authorization: CompletionAuthorization): Promise<void> {
    if (this.#entries.has(authorization.id)) {
      throw new Error(`CompletionAuthorization '${authorization.id}' already exists and is immutable.`);
    }
    this.#entries.set(authorization.id, authorization);
  }

  async findById(id: string): Promise<CompletionAuthorization | null> {
    return this.#entries.get(id) ?? null;
  }

  async findByWorkItemId(workItemId: string): Promise<ReadonlyArray<CompletionAuthorization>> {
    return [...this.#entries.values()].filter((entry) => entry.workItemId === workItemId);
  }
}
