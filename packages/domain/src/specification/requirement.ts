import { Entity } from "@your-harness/shared";

import { RequirementId } from "./requirement-id.js";
import { RequirementName } from "./requirement-name.js";
import { NormativeStatement } from "./normative-statement.js";
import { Scenario } from "./scenario.js";
import { ScenarioId } from "./scenario-id.js";

/**
 * A Requirement represents a specific behavioral obligation of the system.
 *
 * Conceptually:
 * ```text
 * Requirement
 * ├── identity
 * ├── name
 * ├── normative statement
 * └── scenarios
 * ```
 */
export class Requirement extends Entity<RequirementId> {
  readonly #name: RequirementName;
  readonly #normativeStatement: NormativeStatement;
  readonly #scenarios: ReadonlyArray<Scenario>;

  constructor(
    id: RequirementId,
    name: RequirementName,
    normativeStatement: NormativeStatement,
    scenarios: ReadonlyArray<Scenario> = []
  ) {
    super(id);

    this.#name = name;
    this.#normativeStatement = normativeStatement;
    this.#scenarios = scenarios;
  }

  get name(): RequirementName {
    return this.#name;
  }

  get normativeStatement(): NormativeStatement {
    return this.#normativeStatement;
  }

  get scenarios(): ReadonlyArray<Scenario> {
    return this.#scenarios;
  }

  addScenario(scenario: Scenario): Requirement {
    if (this.#scenarios.some((s) => s.id.equals(scenario.id))) {
      throw new Error(`Scenario with id ${scenario.id.value} already exists.`);
    }

    return new Requirement(
      this.id,
      this.#name,
      this.#normativeStatement,
      [...this.#scenarios, scenario]
    );
  }

  removeScenario(scenarioId: ScenarioId): Requirement {
    return new Requirement(
      this.id,
      this.#name,
      this.#normativeStatement,
      this.#scenarios.filter((s) => !s.id.equals(scenarioId))
    );
  }

  updateName(name: RequirementName): Requirement {
    return new Requirement(
      this.id,
      name,
      this.#normativeStatement,
      this.#scenarios
    );
  }

  updateNormativeStatement(normativeStatement: NormativeStatement): Requirement {
    return new Requirement(
      this.id,
      this.#name,
      normativeStatement,
      this.#scenarios
    );
  }
}