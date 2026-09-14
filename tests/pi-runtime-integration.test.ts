import { beforeEach, describe, expect, it, vi } from "vitest";

const { prompt, dispose, createSession } = vi.hoisted(() => {
  const prompt = vi.fn(async () => undefined);
  const dispose = vi.fn();
  const createSession = vi.fn(async () => ({
    session: {
      sessionId: "pi-test-session",
      prompt,
      dispose,
    },
  }));
  return { prompt, dispose, createSession };
});

vi.mock("@earendil-works/pi-coding-agent", () => ({
  createAgentSession: createSession,
  createReadToolDefinition: vi.fn(() => ({ name: "read" })),
  SessionManager: {
    inMemory: vi.fn(() => ({})),
  },
}));

import { PiRuntimeAdapter } from "../src/runtime/pi/index.js";
import { createExecutionEnvironment } from "../src/runtime/index.js";

describe("PiRuntimeAdapter", () => {
  beforeEach(() => {
    prompt.mockClear();
    dispose.mockClear();
    createSession.mockClear();
  });

  it("projects an ExecutionRequest into the Pi prompt and returns the result", async () => {
    const result = await new PiRuntimeAdapter().execute({
      objective: "Implement request validation",
      workspace: "/workspace/project",
      engineeringContext: {
        knowledge: [{ title: "API guide", content: "Use JSON responses." }],
        requirements: [
          {
            name: "Request processing",
            normativeStatement: "The system SHALL process valid requests.",
            scenarios: [
              {
                condition: "a valid request is received",
                expectedBehavior: "the request is processed successfully",
              },
            ],
          },
        ],
        engineeringConstraints: ["No breaking changes"],
      },
      executionConstraints: ["Run tests"],
    });

    expect(result.status).toBe("completed");
    expect(result.runtimeSessionId).toBe("pi-test-session");
    expect(prompt).toHaveBeenCalledWith(expect.stringContaining("Implement request validation"));
    expect(prompt).toHaveBeenCalledWith(expect.stringContaining("The system SHALL process valid requests."));
    expect(prompt).toHaveBeenCalledWith(expect.stringContaining("- Run tests"));
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("habilita sólo la tool read cuando la capability fue explícitamente otorgada", async () => {
    const environment = createExecutionEnvironment({
      workspace: { root: "/workspace/project" },
      capabilities: ["workspace.read"],
    });

    const result = await new PiRuntimeAdapter(environment).execute({
      objective: "Read the project",
      workspace: "/workspace/project",
      engineeringContext: { knowledge: [], requirements: [], engineeringConstraints: [] },
      executionConstraints: [],
    });

    expect(result.status).toBe("completed");
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      tools: ["read"],
      customTools: [expect.objectContaining({ name: "read" })],
    }));
    expect(createSession).toHaveBeenCalledWith(expect.not.objectContaining({ noTools: "all" }));
  });
});
