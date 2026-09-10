import { Identifier } from "../identifiers/index.js";

/**
 * Base class for entities with local identity within an aggregate.
 *
 * Entities are distinguished by their identity, not by their attributes.
 * Unlike AggregateRoot, entities are not the root of an aggregate boundary.
 */
export abstract class Entity<
  TId extends Identifier<string>
> {
  protected constructor(
    private readonly _id: TId
  ) {}

  get id(): TId {
    return this._id;
  }

  equals(other: Entity<TId>): boolean {
    return this.id.equals(other.id);
  }
}