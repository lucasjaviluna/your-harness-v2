import { DomainError } from "../errors/index.js";

/**
 * Represents the result of a domain operation.
 */
export class Result<T> {
  readonly #success: boolean;
  readonly #value?: T;
  readonly #error?: DomainError;

  private constructor(
    success: boolean,
    value?: T,
    error?: DomainError
  ) {
    this.#success = success;
    this.#value = value;
    this.#error = error;
  }

  static success<T>(value: T): Result<T> {
    return new Result(true, value);
  }

  static failure<T>(error: DomainError): Result<T> {
    return new Result(false, undefined, error);
  }

  get isSuccess(): boolean {
    return this.#success;
  }

  get isFailure(): boolean {
    return !this.#success;
  }

  get value(): T {
    if (this.isFailure) {
      throw new Error("Cannot access the value of a failed Result.");
    }

    return this.#value as T;
  }

  get error(): DomainError {
    if (this.isSuccess) {
      throw new Error("Cannot access the error of a successful Result.");
    }

    return this.#error as DomainError;
  }
}
