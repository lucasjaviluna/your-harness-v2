import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { prompt, dispose, createSession, createReadTool } = vi.hoisted(() => {
  const prompt = vi.fn(async () => undefined);
  const dispose = vi.fn();
  const createSession = vi.fn(async () => ({
    session: {
      sessionId: "pi-test-session",
      prompt,
      dispose,
    },
  }));
  const createReadTool = vi.fn((_workspace: string, options: { operations: Record<string, (...args: never[]) => Promise<unknown>> }) => ({ name: "read", operations: options.operations }));
  return { prompt, dispose, createSession, createReadTool };
});

vi.mock("@earendil-works/pi-coding-agent", () => ({
  createAgentSession: createSession,
  createReadToolDefinition: createReadTool,
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
    createReadTool.mockClear();
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

  it("correlaciona una lectura Pi con la ExecutionTrace operacional", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "yh-pi-audit-"));
    try {
      const filePath = path.join(workspace, "README.md");
      await writeFile(filePath, "auditable");
      const recorder = { record: vi.fn(async () => undefined) };
      const environment = createExecutionEnvironment({
        workspace: { root: workspace },
        capabilities: ["workspace.read"],
      });

      await new PiRuntimeAdapter(environment, recorder, "trace-1").execute({
        objective: "Read the project",
        workspace,
        engineeringContext: { knowledge: [], requirements: [], engineeringConstraints: [] },
        executionConstraints: [],
      });

      const tool = createReadTool.mock.results[0]?.value as { operations: { readFile: (absolutePath: string) => Promise<Buffer> } };
      await tool.operations.readFile(filePath);

      expect(recorder.record).toHaveBeenCalledWith(expect.objectContaining({
        executionTraceId: "trace-1",
        toolName: "read",
        outcome: "allowed",
        bytesRead: 9,
      }));
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
