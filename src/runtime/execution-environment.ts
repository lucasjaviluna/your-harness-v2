import path from "node:path";

export type RuntimeCapability =
  | "workspace.read"
  | "workspace.write"
  | "process.execute"
  | "network.access"
  | "secrets.read"
  | "human.confirmation";

export interface WorkspaceBoundary {
  readonly root: string;
  readonly allowedPaths: ReadonlyArray<string>;
  readonly mode: "read-only" | "read-write";
}

export interface NetworkPolicy {
  readonly mode: "disabled" | "allowlist";
  readonly allowedHosts: ReadonlyArray<string>;
}

export interface SecretPolicy {
  readonly mode: "none" | "allowlist";
  readonly allowedNames: ReadonlyArray<string>;
}

export interface ConfirmationPolicy {
  readonly mode: "never" | "on-risk" | "always";
  readonly riskClasses: ReadonlyArray<string>;
}

export interface ExecutionEnvironment {
  readonly workspace: WorkspaceBoundary;
  readonly capabilities: ReadonlyArray<RuntimeCapability>;
  readonly network: NetworkPolicy;
  readonly secrets: SecretPolicy;
  readonly confirmations: ConfirmationPolicy;
}

export interface ExecutionEnvironmentGuard {
  assertWorkspacePath(candidate: string, access?: "read" | "write"): void;
  assertCapability(capability: RuntimeCapability): void;
  assertNetworkHost(host: string): void;
  assertSecret(name: string): void;
  requireConfirmation(riskClass: string, confirmed: boolean): void;
}

export interface ExecutionEnvironmentInput {
  readonly workspace: {
    readonly root: string;
    readonly allowedPaths?: ReadonlyArray<string>;
    readonly mode?: WorkspaceBoundary["mode"];
  };
  readonly capabilities?: ReadonlyArray<RuntimeCapability>;
  readonly network?: Partial<NetworkPolicy>;
  readonly secrets?: Partial<SecretPolicy>;
  readonly confirmations?: Partial<ConfirmationPolicy>;
}

const isWithin = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

/** Enforce la envolvente antes de que un runtime o tool acceda a recursos. */
export const createExecutionEnvironmentGuard = (
  environment: ExecutionEnvironment,
): ExecutionEnvironmentGuard => ({
  assertWorkspacePath(candidate, access = "read") {
    const resolved = path.resolve(candidate);
    if (!environment.workspace.allowedPaths.some((allowed) => isWithin(allowed, resolved))) {
      throw new Error(`Workspace path '${candidate}' is outside the allowed execution environment.`);
    }
    if (access === "write") {
      if (environment.workspace.mode !== "read-write") {
        throw new Error("Workspace write access is denied by the execution environment.");
      }
      if (!environment.capabilities.includes("workspace.write")) {
        throw new Error("Capability 'workspace.write' is not allowed by the execution environment.");
      }
    }
  },
  assertCapability(capability) {
    if (!environment.capabilities.includes(capability)) {
      throw new Error(`Capability '${capability}' is not allowed by the execution environment.`);
    }
  },
  assertNetworkHost(host) {
    if (!environment.capabilities.includes("network.access")) {
      throw new Error("Capability 'network.access' is not allowed by the execution environment.");
    }
    if (environment.network.mode !== "allowlist" || !environment.network.allowedHosts.includes(host)) {
      throw new Error(`Network host '${host}' is not allowed by the execution environment.`);
    }
  },
  assertSecret(name) {
    if (!environment.capabilities.includes("secrets.read")) {
      throw new Error("Capability 'secrets.read' is not allowed by the execution environment.");
    }
    if (environment.secrets.mode !== "allowlist" || !environment.secrets.allowedNames.includes(name)) {
      throw new Error(`Secret '${name}' is not allowed by the execution environment.`);
    }
  },
  requireConfirmation(riskClass, confirmed) {
    if (environment.confirmations.mode === "never") return;
    const requires = environment.confirmations.mode === "always" || environment.confirmations.riskClasses.includes(riskClass);
    if (requires && !confirmed) {
      throw new Error(`Human confirmation is required for risk class '${riskClass}'.`);
    }
  },
});

/** Construye una envolvente segura y todavía sin autorización de tools. */
export const createExecutionEnvironment = (
  input: ExecutionEnvironmentInput,
): ExecutionEnvironment => {
  const root = path.resolve(input.workspace.root);
  const allowedPaths = (input.workspace.allowedPaths ?? [root]).map((candidate) =>
    path.resolve(root, candidate),
  );

  if (!input.workspace.root.trim()) {
    throw new Error("Execution workspace root cannot be empty.");
  }
  if (allowedPaths.some((candidate) => !isWithin(root, candidate))) {
    throw new Error("Every allowed workspace path must be inside the workspace root.");
  }

  const capabilities = [...new Set(input.capabilities ?? [])];
  const network: NetworkPolicy = {
    mode: input.network?.mode ?? "disabled",
    allowedHosts: [...(input.network?.allowedHosts ?? [])],
  };
  const secrets: SecretPolicy = {
    mode: input.secrets?.mode ?? "none",
    allowedNames: [...(input.secrets?.allowedNames ?? [])],
  };
  const confirmations: ConfirmationPolicy = {
    mode: input.confirmations?.mode ?? "always",
    riskClasses: [...(input.confirmations?.riskClasses ?? ["workspace.write", "process.execute", "network.access", "secrets.read"])],
  };

  if (network.mode === "allowlist" && network.allowedHosts.length === 0) {
    throw new Error("Network allowlist must contain at least one host.");
  }
  if (secrets.mode === "allowlist" && secrets.allowedNames.length === 0) {
    throw new Error("Secret allowlist must contain at least one secret name.");
  }
  if (capabilities.includes("workspace.write") && input.workspace.mode !== "read-write") {
    throw new Error("workspace.write requires a read-write workspace boundary.");
  }
  if (capabilities.includes("network.access") && network.mode === "disabled") {
    throw new Error("network.access requires an enabled network policy.");
  }
  if (capabilities.includes("secrets.read") && secrets.mode === "none") {
    throw new Error("secrets.read requires an explicit secret policy.");
  }

  return {
    workspace: {
      root,
      allowedPaths,
      mode: input.workspace.mode ?? "read-only",
    },
    capabilities,
    network,
    secrets,
    confirmations,
  };
};
