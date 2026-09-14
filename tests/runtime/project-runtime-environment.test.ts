import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import { createProjectRuntimeEnvironment } from "../../src/runtime/index.js";

describe("ProjectRuntimeEnvironment", () => {
  it("compone runtime, SDD, elegibilidad y entorno desde la configuración", () => {
    const config = loadConfig({
      globalConfigPath: "does-not-exist.yml",
      localConfigPath: "does-not-exist.yml",
    });
    const configured = {
      ...config,
      runtime: {
        ...config.runtime,
        defaultRuntime: "pi",
        requireSddChangeTraceability: true,
        executionEnvironment: {
          ...config.runtime.executionEnvironment,
          workspace: { mode: "read-write" as const, allowedPaths: ["src"] },
          capabilities: ["workspace.read", "workspace.write"] as const,
        },
      },
    };

    const environment = createProjectRuntimeEnvironment({
      config: configured,
      workspace: "C:/workspace",
    });

    expect(environment.runtimeEnvironment.defaultRuntime).toBe("pi");
    expect(environment.runtimeEnvironment.listRuntimes()).toEqual(["fake", "pi"]);
    expect(environment.sddProvider.id).toBe("openspec");
    expect(environment.sddMaterializerMode).toBe("filesystem");
    expect(environment.runtimeEnvironment.executionEnvironment.workspace).toMatchObject({
      root: path.resolve("C:/workspace"),
      allowedPaths: [path.resolve("C:/workspace", "src")],
      mode: "read-write",
    });
    expect(
      environment.executionEligibilityPolicy.evaluate({
        specification: { status: "approved" } as never,
      }),
    ).toMatchObject({ eligible: false, reasons: ["SDD_CHANGE_TRACEABILITY_REQUIRED"] });
  });
});
