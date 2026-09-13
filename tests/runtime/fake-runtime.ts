import type {
  ExecutionRequest,
  RuntimePort,
  RuntimeResult,
} from "@your-harness/application";

/** Runtime determinista para validar el boundary sin depender de Pi. */
export class FakeRuntimeAdapter implements RuntimePort {
  readonly requests: ExecutionRequest[] = [];

  async execute(request: ExecutionRequest): Promise<RuntimeResult> {
    this.requests.push(request);

    return {
      status: "completed",
      summary: "Fake runtime completed the requested execution.",
      runtimeSessionId: "fake-runtime-session",
      timestamps: {
        startedAt: "2026-09-13T00:00:00.000Z",
        completedAt: "2026-09-13T00:00:01.000Z",
      },
    };
  }
}
