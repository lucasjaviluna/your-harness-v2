import { describe, expect, it } from "vitest";

import { createExecutionEnvironment, createExecutionEnvironmentGuard } from "../../src/runtime/index.js";

describe("ExecutionEnvironment", () => {
  it("crea una envolvente segura por defecto", () => {
    const environment = createExecutionEnvironment({ workspace: { root: "." } });

    expect(environment.workspace.mode).toBe("read-only");
    expect(environment.capabilities).toEqual([]);
    expect(environment.network.mode).toBe("disabled");
    expect(environment.secrets.mode).toBe("none");
    expect(environment.confirmations.mode).toBe("always");
  });

  it("rechaza capacidades que no tienen una política explícita", () => {
    expect(() =>
      createExecutionEnvironment({
        workspace: { root: "." },
        capabilities: ["workspace.write"],
      }),
    ).toThrow("workspace.write requires a read-write workspace boundary");

    expect(() =>
      createExecutionEnvironment({
        workspace: { root: "." },
        capabilities: ["network.access"],
      }),
    ).toThrow("network.access requires an enabled network policy");
  });

  it("no permite escapar del workspace permitido", () => {
    expect(() =>
      createExecutionEnvironment({
        workspace: { root: "C:/workspace", allowedPaths: ["C:/workspace", "C:/other"] },
      }),
    ).toThrow("inside the workspace root");
  });

  it("enforces workspace writes, capabilities, network, secrets and confirmations", () => {
    const environment = createExecutionEnvironment({
      workspace: { root: "C:/workspace", mode: "read-write" },
      capabilities: ["workspace.write", "network.access", "secrets.read"],
      network: { mode: "allowlist", allowedHosts: ["api.example.com"] },
      secrets: { mode: "allowlist", allowedNames: ["API_KEY"] },
      confirmations: { mode: "always" },
    });
    const guard = createExecutionEnvironmentGuard(environment);

    expect(() => guard.assertWorkspacePath("C:/workspace/src", "write")).not.toThrow();
    expect(() => guard.assertWorkspacePath("C:/outside", "read")).toThrow("outside");
    expect(() => guard.assertNetworkHost("other.example.com")).toThrow("not allowed");
    expect(() => guard.assertSecret("OTHER_KEY")).toThrow("not allowed");
    expect(() => guard.requireConfirmation("workspace.write", false)).toThrow("confirmation is required");
    expect(() => guard.requireConfirmation("workspace.write", true)).not.toThrow();
  });

  it("resuelve allowedPaths relativos contra la raíz del workspace", () => {
    const environment = createExecutionEnvironment({
      workspace: { root: "C:/workspace", allowedPaths: ["src"] },
    });
    const guard = createExecutionEnvironmentGuard(environment);

    expect(() => guard.assertWorkspacePath("C:/workspace/src/index.ts", "read")).not.toThrow();
    expect(() => guard.assertWorkspacePath("C:/workspace/packages/index.ts", "read")).toThrow("outside");
  });

  it("rejects a write when the capability is missing even in read-write mode", () => {
    const environment = createExecutionEnvironment({
      workspace: { root: "C:/workspace", mode: "read-write" },
    });
    const guard = createExecutionEnvironmentGuard(environment);

    expect(() => guard.assertWorkspacePath("C:/workspace/file.txt", "write")).toThrow("workspace.write");
  });
});
