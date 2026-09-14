import path from "node:path";

import {
  createExecutionEligibilityPolicy,
  type ExecutionEligibilityPolicy,
  type SddMaterializer,
  type SddProvider,
} from "@your-harness/application";

import type { ValidatedConfig } from "../core/config.js";
import {
  createFilesystemOpenSpecGenerationStrategy,
  createOpenSpecCommandGenerationStrategy,
  OpenSpecMaterializer,
  type OpenSpecProposalCommandRunner,
  OpenSpecSddProvider,
} from "../sdd/index.js";
import {
  createExecutionEnvironment,
  createExecutionEnvironmentGuard,
  type ExecutionEnvironment,
} from "./execution-environment.js";
import {
  createRuntimeEnvironment,
  type RuntimeEnvironment,
  type RuntimeName,
} from "./runtime-environment.js";
import type { ToolInvocationRecorder } from "./tool-invocation-trace.js";

export interface ProjectRuntimeEnvironment {
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly sddProvider: SddProvider;
  readonly sddMaterializerMode: ValidatedConfig["runtime"]["sddMaterializer"];
  readonly sddMaterializer: SddMaterializer;
  readonly executionEligibilityPolicy: ExecutionEligibilityPolicy;
}

export interface ProjectRuntimeEnvironmentOptions {
  readonly config: ValidatedConfig;
  readonly workspace: string;
  /** Sobrescribe sólo esta ejecución; si falta se usa runtime.defaultRuntime. */
  readonly runtime?: RuntimeName;
  readonly toolInvocationRecorder?: ToolInvocationRecorder;
  readonly executionTraceId?: string;
  readonly sddMaterializerRunner?: OpenSpecProposalCommandRunner;
  /** Confirmación recibida por la operación HITM actual; por defecto se deniega. */
  readonly sddMaterializerConfirmed?: boolean;
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

const createConfiguredSddMaterializer = (
  config: ValidatedConfig,
  workspace: string,
  runner: OpenSpecProposalCommandRunner | undefined,
  confirmed: boolean,
): SddMaterializer => {
  const environment = createConfiguredExecutionEnvironment(config, workspace);
  const guard = createExecutionEnvironmentGuard(environment);
  const mode = config.runtime.sddMaterializer;

  if (mode === "external-command" && !runner) {
    throw new Error("runtime.sddMaterializer=external-command requires an injected sddMaterializerRunner.");
  }

  return new OpenSpecMaterializer({
    guard,
    confirmed,
    generationStrategy:
      mode === "external-command" && runner
        ? createOpenSpecCommandGenerationStrategy(runner)
        : createFilesystemOpenSpecGenerationStrategy(),
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
      toolInvocationRecorder: options.toolInvocationRecorder,
      executionTraceId: options.executionTraceId,
    }),
    sddProvider: createConfiguredSddProvider(options.config.runtime.sddProvider),
    sddMaterializerMode: options.config.runtime.sddMaterializer,
    sddMaterializer: createConfiguredSddMaterializer(
      options.config,
      options.workspace,
      options.sddMaterializerRunner,
      options.sddMaterializerConfirmed ?? false,
    ),
    executionEligibilityPolicy: createExecutionEligibilityPolicy({
      requireSddChangeTraceability:
        options.config.runtime.requireSddChangeTraceability,
    }),
  };
};
