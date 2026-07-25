/**
 * Base class for immutable Value Objects.
 *
 * Value Objects are compared by value rather than identity.
 */
export abstract class ValueObject<TValue> {
  readonly #value: TValue;

  protected constructor(value: TValue) {
    this.#value = Object.freeze(value);
  }

  get value(): TValue {
    return this.#value;
  }

  equals(other: ValueObject<TValue>): boolean {
    return Object.is(this.#value, other.value);
  }
}
