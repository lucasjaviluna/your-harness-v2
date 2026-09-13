import type { RuntimePort } from "@your-harness/application";

import { FakeRuntimeAdapter } from "./fake-runtime-adapter.js";
import { PiRuntimeAdapter } from "./pi/pi-runtime-adapter.js";

export type RuntimeName = "fake" | "pi";

export interface RuntimeEnvironment {
  readonly defaultRuntime: RuntimeName;
  listRuntimes(): ReadonlyArray<RuntimeName>;
  resolve(name?: string): RuntimePort;
}

export interface RuntimeEnvironmentOptions {
  readonly defaultRuntime?: RuntimeName;
  readonly runtimes?: Partial<Record<RuntimeName, RuntimePort>>;
}

/** Composition root experimental para seleccionar un RuntimePort disponible. */
export const createRuntimeEnvironment = (
  options: RuntimeEnvironmentOptions = {},
): RuntimeEnvironment => {
  const runtimes = new Map<RuntimeName, RuntimePort>([
    ["fake", options.runtimes?.fake ?? new FakeRuntimeAdapter()],
    ["pi", options.runtimes?.pi ?? new PiRuntimeAdapter()],
  ]);
  const defaultRuntime = options.defaultRuntime ?? "pi";

  return {
    defaultRuntime,
    listRuntimes: () => [...runtimes.keys()],
    resolve(name = defaultRuntime) {
      const runtime = runtimes.get(name as RuntimeName);
      if (!runtime) {
        throw new Error(
          `Runtime '${name}' is not available. Available runtimes: ${[
            ...runtimes.keys(),
          ].join(", ")}.`,
        );
      }
      return runtime;
    },
  };
};
