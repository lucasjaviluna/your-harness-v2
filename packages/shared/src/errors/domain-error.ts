/**
 * Base class for all domain errors.
 *
 * Domain errors represent expected business failures.
 * They are not infrastructure or programming errors.
 */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);

    this.name = new.target.name;
  }
}
