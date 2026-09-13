import type { RuntimePort } from "@your-harness/application";

import { FakeRuntimeAdapter } from "./fake-runtime-adapter.js";
import { PiRuntimeAdapter } from "./pi/pi-runtime-adapter.js";

export type RuntimeName = string;

export interface RuntimeRegistry {
  register(name: RuntimeName, runtime: RuntimePort): void;
  has(name: RuntimeName): boolean;
  list(): ReadonlyArray<RuntimeName>;
  resolve(name: RuntimeName): RuntimePort;
}

export const createRuntimeRegistry = (
  runtimes: Readonly<Record<RuntimeName, RuntimePort>> = {},
): RuntimeRegistry => {
  const entries = new Map<RuntimeName, RuntimePort>(Object.entries(runtimes));

  return {
    register(name, runtime) {
      if (!name.trim()) {
        throw new Error("Runtime name cannot be empty.");
      }
      if (entries.has(name)) {
        throw new Error(`Runtime '${name}' is already registered.`);
      }
      entries.set(name, runtime);
    },
    has: (name) => entries.has(name),
    list: () => [...entries.keys()],
    resolve(name) {
      const runtime = entries.get(name);
      if (!runtime) {
        throw new Error(
          `Runtime '${name}' is not available. Available runtimes: ${[
            ...entries.keys(),
          ].join(", ")}.`,
        );
      }
      return runtime;
    },
  };
};

export interface RuntimeEnvironment {
  readonly defaultRuntime: RuntimeName;
  readonly registry: RuntimeRegistry;
  listRuntimes(): ReadonlyArray<RuntimeName>;
  resolveName(name?: RuntimeName): RuntimeName;
  resolve(name?: RuntimeName): RuntimePort;
}

export interface RuntimeEnvironmentOptions {
  readonly defaultRuntime?: RuntimeName;
  readonly runtimes?: Readonly<Record<RuntimeName, RuntimePort>>;
  /** Registra Pi sólo cuando la composición lo solicita explícitamente. */
  readonly includePi?: boolean;
}

/** Composition root configurable para seleccionar un RuntimePort disponible. */
export const createRuntimeEnvironment = (
  options: RuntimeEnvironmentOptions = {},
): RuntimeEnvironment => {
  const registry = createRuntimeRegistry(options.runtimes);

  if (!registry.has("fake")) {
    registry.register("fake", new FakeRuntimeAdapter());
  }
  if (options.includePi && !registry.has("pi")) {
    registry.register("pi", new PiRuntimeAdapter());
  }

  const defaultRuntime = options.defaultRuntime ?? "fake";
  if (!registry.has(defaultRuntime)) {
    throw new Error(
      `Default runtime '${defaultRuntime}' is not available. Available runtimes: ${registry
        .list()
        .join(", ")}.`,
    );
  }

  return {
    defaultRuntime,
    registry,
    listRuntimes: () => registry.list(),
    resolveName: (name = defaultRuntime) => {
      registry.resolve(name);
      return name;
    },
    resolve: (name = defaultRuntime) => registry.resolve(name),
  };
};
