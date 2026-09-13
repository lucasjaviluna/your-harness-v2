import path from "node:path";

import {
  createExecutionEligibilityPolicy,
  type ExecutionEligibilityPolicy,
  type SddProvider,
} from "@your-harness/application";

import type { ValidatedConfig } from "../core/config.js";
import { OpenSpecSddProvider } from "../sdd/index.js";
import {
  createExecutionEnvironment,
  type ExecutionEnvironment,
} from "./execution-environment.js";
import {
  createRuntimeEnvironment,
  type RuntimeEnvironment,
  type RuntimeName,
} from "./runtime-environment.js";

export interface ProjectRuntimeEnvironment {
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly sddProvider: SddProvider;
  readonly executionEligibilityPolicy: ExecutionEligibilityPolicy;
}

export interface ProjectRuntimeEnvironmentOptions {
  readonly config: ValidatedConfig;
  readonly workspace: string;
  /** Sobrescribe sólo esta ejecución; si falta se usa runtime.defaultRuntime. */
  readonly runtime?: RuntimeName;
}

const createConfiguredSddProvider = (
  provider: ValidatedConfig["runtime"]["sddProvider"],
): SddProvider => {
  switch (provider) {
    case "openspec":
      return new OpenSpecSddProvider();
  }
};

const createConfiguredExecutionEnvironment = (
  config: ValidatedConfig,
  workspace: string,
): ExecutionEnvironment => {
  const policy = config.runtime.executionEnvironment;
  const root = path.resolve(workspace);

  return createExecutionEnvironment({
    workspace: {
      root,
      allowedPaths: policy.workspace.allowedPaths?.map((allowedPath) =>
        path.resolve(root, allowedPath),
      ),
      mode: policy.workspace.mode,
    },
    capabilities: policy.capabilities,
    network: policy.network,
    secrets: policy.secrets,
    confirmations: policy.confirmations,
  });
};

/**
 * Composition root por proyecto. Traduce config.yml a los contratos de
 * runtime, SDD y elegibilidad sin filtrar configuración hacia Application.
 */
export const createProjectRuntimeEnvironment = (
  options: ProjectRuntimeEnvironmentOptions,
): ProjectRuntimeEnvironment => {
  const selectedRuntime = options.runtime ?? options.config.runtime.defaultRuntime;
  const executionEnvironment = createConfiguredExecutionEnvironment(
    options.config,
    options.workspace,
  );

  return {
    runtimeEnvironment: createRuntimeEnvironment({
      defaultRuntime: selectedRuntime,
      includePi: selectedRuntime === "pi",
      workspace: options.workspace,
      executionEnvironment,
    }),
    sddProvider: createConfiguredSddProvider(options.config.runtime.sddProvider),
    executionEligibilityPolicy: createExecutionEligibilityPolicy({
      requireSddChangeTraceability:
        options.config.runtime.requireSddChangeTraceability,
    }),
  };
};
