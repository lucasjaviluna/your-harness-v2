import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import type { ExecutionRequest, RuntimePort, RuntimeResult } from "@your-harness/application";
import { buildPiExecutionPrompt } from "./pi-execution-prompt.js";
import { createExecutionEnvironmentGuard, type ExecutionEnvironment, type ExecutionEnvironmentGuard } from "../execution-environment.js";

export class PiRuntimeAdapter implements RuntimePort {
  private readonly guard?: ExecutionEnvironmentGuard;

  constructor(private readonly executionEnvironment?: ExecutionEnvironment) {
    this.guard = executionEnvironment ? createExecutionEnvironmentGuard(executionEnvironment) : undefined;
  }

  async execute(request: ExecutionRequest): Promise<RuntimeResult> {
    this.guard?.assertWorkspacePath(request.workspace, "read");
    const startedAt = new Date().toISOString();
    let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | undefined;

    try {
      const created = await createAgentSession({
        cwd: request.workspace,
        ...(this.executionEnvironment?.capabilities.includes("workspace.read")
          ? { tools: ["read"] }
          : { noTools: "all" }),
        sessionManager: SessionManager.inMemory()
      });
      session = created.session;

      await session.prompt(buildPiExecutionPrompt(request));

      return {
        status: "completed",
        summary: "Pi runtime completed the requested execution.",
        runtimeSessionId: session.sessionId,
        timestamps: { startedAt, completedAt: new Date().toISOString() },
      };
    } catch (error) {
      return {
        status: "failed",
        summary: "Pi runtime failed to execute the request.",
        timestamps: { startedAt, completedAt: new Date().toISOString() },
        failure: {
          code: "PI_RUNTIME_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    } finally {
      session?.dispose();
    }
  }
}
