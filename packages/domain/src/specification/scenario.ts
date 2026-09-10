import { Entity } from "@your-harness/shared";

import { ScenarioId } from "./scenario-id.js";
import { ScenarioCondition } from "./scenario-condition.js";
import { ScenarioExpectedBehavior } from "./scenario-expected-behavior.js";

/**
 * A Scenario represents an explicit condition and expected behavior
 * associated with a Requirement.
 *
 * Conceptually:
 * ```text
 * Scenario
 * ├── condition / WHEN
 * └── expected behavior / THEN
 * ```
 */
export class Scenario extends Entity<ScenarioId> {
  readonly #condition: ScenarioCondition;
  readonly #expectedBehavior: ScenarioExpectedBehavior;

  constructor(
    id: ScenarioId,
    condition: ScenarioCondition,
    expectedBehavior: ScenarioExpectedBehavior
  ) {
    super(id);

    this.#condition = condition;
    this.#expectedBehavior = expectedBehavior;
  }

  get condition(): ScenarioCondition {
    return this.#condition;
  }

  get expectedBehavior(): ScenarioExpectedBehavior {
    return this.#expectedBehavior;
  }

  updateCondition(condition: ScenarioCondition): Scenario {
    return new Scenario(this.id, condition, this.#expectedBehavior);
  }

  updateExpectedBehavior(expectedBehavior: ScenarioExpectedBehavior): Scenario {
    return new Scenario(this.id, this.#condition, expectedBehavior);
  }
}