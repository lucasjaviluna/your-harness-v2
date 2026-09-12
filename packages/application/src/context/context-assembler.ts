import {
  Specification,
  SpecificationStatus,
} from "../../../domain/src/specification/index.js";

import type { EngineeringContext } from "./engineering-context.js";
import type { EngineeringKnowledge } from "./engineering-knowledge.js";

export interface ContextAssemblyInput {
  readonly specification: Specification;
  readonly knowledge?: ReadonlyArray<EngineeringKnowledge>;
  readonly engineeringConstraints?: ReadonlyArray<string>;
}

export interface ContextAssembler {
  /** Proyecta una Specification aprobada al contexto de una ejecución. */
  assemble(input: ContextAssemblyInput): EngineeringContext;
}

/**
 * Crea el ensamblador de contexto de la capa de aplicación.
 *
 * La primera política es deliberadamente simple: una Specification aprobada
 * aporta todos sus requisitos y escenarios. La selección específica por
 * WorkItem o conocimiento recuperado puede incorporarse posteriormente sin
 * acoplar el runtime al modelo de dominio.
 */
export const createContextAssembler = (): ContextAssembler => ({
  assemble({ specification, knowledge = [], engineeringConstraints = [] }) {
    if (specification.status !== SpecificationStatus.Approved) {
      throw new Error(
        "Solo las especificaciones aprobadas pueden convertirse en un EngineeringContext."
      );
    }

    return {
      knowledge: [...knowledge],
      requirements: specification.requirements.map((requirement) => ({
        name: requirement.name.value,
        normativeStatement: requirement.normativeStatement.value,
        scenarios: requirement.scenarios.map((scenario) => ({
          condition: scenario.condition.value,
          expectedBehavior: scenario.expectedBehavior.value,
        })),
      })),
      engineeringConstraints: [...engineeringConstraints],
    };
  },
});
