import { describe, expect, it } from "vitest";

import { createExecutionEnvironment } from "../../src/runtime/index.js";

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
});
