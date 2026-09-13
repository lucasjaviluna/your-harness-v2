import { describe, expect, it } from "vitest";

import { createRuntimeEnvironment } from "../../src/runtime/index.js";

describe("RuntimeEnvironment", () => {
  it("lists and resolves the available runtimes", () => {
    const environment = createRuntimeEnvironment({ defaultRuntime: "fake" });

    expect(environment.listRuntimes()).toEqual(["fake", "pi"]);
    expect(environment.resolve()).toBe(environment.resolve("fake"));
  });

  it("fails clearly for an unavailable runtime", () => {
    const environment = createRuntimeEnvironment();

    expect(() => environment.resolve("native")).toThrow(
      "Runtime 'native' is not available",
    );
  });
});
