import type {
  CompletionAuthorizationDecision,
  CompletionAuthorizationRole,
} from "./completion-authorization.js";

export interface CompletionAuthorizationPolicy {
  authorize(input: {
    readonly actor: string;
    readonly role: CompletionAuthorizationRole;
    readonly decision: CompletionAuthorizationDecision;
  }): void;
}

export type CompletionAuthorizationDecisionsByRole = Readonly<Record<CompletionAuthorizationRole, ReadonlyArray<CompletionAuthorizationDecision>>>;

const defaultDecisions: CompletionAuthorizationDecisionsByRole = {
  engineer: ["request-rework", "require-further-review"],
  reviewer: ["authorize-completion", "request-rework", "require-further-review"],
  maintainer: ["authorize-completion", "request-rework", "require-further-review"],
  owner: ["authorize-completion", "request-rework", "require-further-review"],
};

/** Política HITM mínima: identidad, rol y decisión deben ser explícitos y compatibles. */
export const createCompletionAuthorizationPolicy = (
  decisionsByRole: CompletionAuthorizationDecisionsByRole = defaultDecisions,
): CompletionAuthorizationPolicy => ({
  authorize({ actor, role, decision }) {
    if (!actor.trim()) throw new Error("Completion authorization actor cannot be empty.");
    const allowed = decisionsByRole[role];
    if (!allowed) throw new Error(`Completion authorization role '${role}' is not recognized.`);
    if (!allowed.includes(decision)) {
      throw new Error(`Role '${role}' is not allowed to record decision '${decision}'.`);
    }
  },
});
