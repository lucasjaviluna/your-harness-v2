import { describe, expect, it } from "vitest";

import type { RuntimePort } from "@your-harness/application";
import {
  createRuntimeEnvironment,
  createRuntimeRegistry,
} from "../../src/runtime/index.js";

describe("RuntimeEnvironment", () => {
  it("lists and resolves the available runtimes", () => {
    const environment = createRuntimeEnvironment();

    expect(environment.defaultRuntime).toBe("fake");
    expect(environment.listRuntimes()).toEqual(["fake"]);
    expect(environment.resolve()).toBe(environment.resolve("fake"));
  });

  it("registra runtimes explícitos sin instanciar Pi", () => {
    const fake: RuntimePort = {
      execute: async () => ({
        status: "completed",
        summary: "ok",
        timestamps: { startedAt: "now" },
      }),
    };
    const registry = createRuntimeRegistry({ native: fake });
    registry.register("custom", fake);

    expect(registry.list()).toEqual(["native", "custom"]);
    expect(registry.resolve("custom")).toBe(fake);
  });

  it("incluye Pi sólo cuando la composición lo solicita", () => {
    const environment = createRuntimeEnvironment({
      includePi: true,
      defaultRuntime: "pi",
    });

    expect(environment.listRuntimes()).toEqual(["fake", "pi"]);
    expect(environment.resolve()).toBe(environment.resolve("pi"));
  });

  it("fails clearly for an unavailable runtime", () => {
    const environment = createRuntimeEnvironment();

    expect(() => environment.resolve("native")).toThrow(
      "Runtime 'native' is not available",
    );
  });
});
