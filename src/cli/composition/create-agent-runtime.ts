import { developerAgent } from "../../agents/builtin/developer.js";
import { reviewerAgent } from "../../agents/builtin/reviewer.js";
import { createAgentRunner } from "../../agents/runner.js";
import type { AgentDefinition } from "../../agents/types.js";

export interface CliAgentRuntime {
  readonly runner: ReturnType<typeof createAgentRunner>;
  readonly agents: Readonly<Record<string, AgentDefinition>>;
}

/** Recursos de agentes compartidos por comandos `agent` y `workflow`. */
export const createCliAgentRuntime = (): CliAgentRuntime => ({
  runner: createAgentRunner(),
  agents: {
    developer: developerAgent,
    reviewer: reviewerAgent,
  },
});
