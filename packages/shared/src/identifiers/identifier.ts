/**
 * Base class for strongly typed identifiers.
 *
 * Identifiers are immutable value objects whose only responsibility
 * is to uniquely identify an entity or aggregate.
 */
export abstract class Identifier<TValue extends string> {
  readonly #value: TValue;

  protected constructor(value: TValue) {
    if (value.trim().length === 0) {
      throw new Error("Identifier cannot be empty.");
    }

    this.#value = value;
  }

  get value(): TValue {
    return this.#value;
  }

  equals(other: Identifier<TValue>): boolean {
    return this.#value === other.value;
  }

  toString(): string {
    return this.#value;
  }
}
