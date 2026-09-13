import type {
  ExecutionRequest,
  RuntimePort,
  RuntimeResult,
} from "@your-harness/application";

/** Runtime local determinista para composición y pruebas del CLI. */
export class FakeRuntimeAdapter implements RuntimePort {
  async execute(request: ExecutionRequest): Promise<RuntimeResult> {
    return {
      status: "completed",
      summary: `Fake runtime completed: ${request.objective}`,
      runtimeSessionId: "fake-runtime-session",
      timestamps: {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    };
  }
}
