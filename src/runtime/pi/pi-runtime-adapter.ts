import { randomUUID } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import type { ExecutionRequest, RuntimePort, RuntimeResult } from "@your-harness/application";
import { buildPiExecutionPrompt } from "./pi-execution-prompt.js";
import { createExecutionEnvironmentGuard, type ExecutionEnvironment, type ExecutionEnvironmentGuard } from "../execution-environment.js";
import type { ToolInvocationRecorder } from "../tool-invocation-trace.js";

export class PiRuntimeAdapter implements RuntimePort {
  private readonly guard?: ExecutionEnvironmentGuard;

  constructor(
    private readonly executionEnvironment?: ExecutionEnvironment,
    private readonly toolInvocationRecorder?: ToolInvocationRecorder,
    private readonly executionTraceId?: string,
  ) {
    this.guard = executionEnvironment ? createExecutionEnvironmentGuard(executionEnvironment) : undefined;
  }

  private async recordToolInvocation(input: {
    readonly sessionId?: string;
    readonly resolvedPath: string;
    readonly outcome: "allowed" | "denied" | "failed";
    readonly bytesRead?: number;
    readonly reason?: string;
  }): Promise<void> {
    if (!this.toolInvocationRecorder) return;
    try {
      await this.toolInvocationRecorder.record({
        id: randomUUID(),
        runtimeId: "pi",
        executionTraceId: this.executionTraceId,
        sessionId: input.sessionId,
        toolName: "read",
        requestedPath: input.resolvedPath,
        resolvedPath: input.resolvedPath,
        bytesRead: input.bytesRead,
        outcome: input.outcome,
        reason: input.reason,
        invokedAt: new Date().toISOString(),
      });
    } catch {
      // La auditoría no debe convertir una ejecución permitida en un fallo de runtime.
    }
  }

  async execute(request: ExecutionRequest): Promise<RuntimeResult> {
    this.guard?.assertWorkspacePath(request.workspace, "read");
    const startedAt = new Date().toISOString();
    const { createAgentSession, createReadToolDefinition, SessionManager } = await import("@earendil-works/pi-coding-agent");
    let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | undefined;

    try {
      const readTool = this.executionEnvironment?.capabilities.includes("workspace.read")
        ? createReadToolDefinition(request.workspace, {
          operations: {
            access: async (absolutePath) => {
              try {
                this.guard?.assertWorkspacePath(absolutePath, "read");
                await access(absolutePath);
              } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                await this.recordToolInvocation({ resolvedPath: absolutePath, outcome: reason.includes("outside") ? "denied" : "failed", reason });
                throw error;
              }
            },
            readFile: async (absolutePath) => {
              try {
                this.guard?.assertWorkspacePath(absolutePath, "read");
                const content = await readFile(absolutePath);
                if (content.byteLength > 256 * 1024) {
                  throw new Error("Pi read tool refuses files larger than 256 KiB.");
                }
                await this.recordToolInvocation({ sessionId: session?.sessionId, resolvedPath: absolutePath, outcome: "allowed", bytesRead: content.byteLength });
                return content;
              } catch (error) {
                await this.recordToolInvocation({ sessionId: session?.sessionId, resolvedPath: absolutePath, outcome: error instanceof Error && error.message.includes("outside") ? "denied" : "failed", reason: error instanceof Error ? error.message : String(error) });
                throw error;
              }
            },
          },
        })
        : undefined;

      const created = await createAgentSession({
        cwd: request.workspace,
        ...(this.executionEnvironment?.capabilities.includes("workspace.read")
          ? { tools: ["read"], customTools: readTool ? [readTool as never] : [] }
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
