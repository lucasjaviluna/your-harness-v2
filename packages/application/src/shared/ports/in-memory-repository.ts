import type { Repository } from "./repository.js";

export interface Identifiable {
  readonly id: { readonly value: string };
}

/** Repositorio temporal para composición y tests sin persistencia externa. */
export class InMemoryRepository<
  TAggregate extends Identifiable,
  TId extends { readonly value: string },
> implements Repository<TAggregate, TId>
{
  readonly #items = new Map<string, TAggregate>();

  async findById(id: TId): Promise<TAggregate | null> {
    return this.#items.get(id.value) ?? null;
  }

  async save(aggregate: TAggregate): Promise<void> {
    this.#items.set(aggregate.id.value, aggregate);
  }

  async delete(id: TId): Promise<void> {
    this.#items.delete(id.value);
  }
}
