import { Identifier } from "../identifiers/index.js";

/**
 * Base class for aggregate roots.
 *
 * Every aggregate root owns a strongly typed identifier.
 */
export abstract class AggregateRoot<
  TId extends Identifier<string>
> {
  protected constructor(
    private readonly _id: TId
  ) {}

  get id(): TId {
    return this._id;
  }

  equals(other: AggregateRoot<TId>): boolean {
    return this.id.equals(other.id);
  }
}
