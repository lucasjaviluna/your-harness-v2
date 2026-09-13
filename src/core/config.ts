import { z } from "zod";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { parse, stringify } from "yaml";
import dotenv from "dotenv";
import type {
  HarnessConfig,
  LogLevel,
  ModeType,
  ProviderType,
} from "../types/index.js";

dotenv.config();

// Schema de validación
const providerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  endpoint: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

const executionEnvironmentConfigSchema = z.object({
  workspace: z
    .object({
      allowedPaths: z.array(z.string()).optional(),
      mode: z.enum(["read-only", "read-write"]).optional(),
    })
    .default({}),
  capabilities: z
    .array(
      z.enum([
        "workspace.read",
        "workspace.write",
        "process.execute",
        "network.access",
        "secrets.read",
        "human.confirmation",
      ]),
    )
    .default([]),
  network: z
    .object({
      mode: z.enum(["disabled", "allowlist"]).optional(),
      allowedHosts: z.array(z.string()).optional(),
    })
    .default({}),
  secrets: z
    .object({
      mode: z.enum(["none", "allowlist"]).optional(),
      allowedNames: z.array(z.string()).optional(),
    })
    .default({}),
  confirmations: z
    .object({
      mode: z.enum(["never", "on-risk", "always"]).optional(),
      riskClasses: z.array(z.string()).optional(),
    })
    .default({}),
});

const runtimeConfigSchema = z.object({
  defaultRuntime: z.string().trim().min(1).default("fake"),
  sddProvider: z.enum(["openspec"]).default("openspec"),
  requireSddChangeTraceability: z.boolean().default(false),
  executionEnvironment: executionEnvironmentConfigSchema.default({}),
});

const harnessConfigSchema = z.object({
  version: z.string().default("0.1.0"),
  defaultProvider: z
    .enum(["copilot", "claude", "openai", "local", "custom"])
    .default("claude"),
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  mode: z
    .enum(["frontend", "backend", "devops", "testing", "analysis", "custom"])
    .default("custom"),
  providers: z
    .record(
      z.enum(["copilot", "claude", "openai", "local", "custom"]),
      providerConfigSchema,
    )
    .default({}),
  plugins: z
    .array(
      z.object({
        name: z.string(),
        version: z.string(),
        enabled: z.boolean(),
        config: z.record(z.unknown()).optional(),
      }),
    )
    .optional(),
  mcpServers: z
    .array(
      z.object({
        name: z.string(),
        command: z.string(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string()).optional(),
        enabled: z.boolean(),
      }),
    )
    .optional(),
  runtime: runtimeConfigSchema.default({}),
});

export type ValidatedConfig = z.infer<typeof harnessConfigSchema>;

const DEFAULT_CONFIG: ValidatedConfig = {
  version: "0.1.0",
  defaultProvider: "claude",
  logLevel: "info",
  mode: "custom",
  providers: {
    copilot: { enabled: false },
    claude: { enabled: false },
    openai: { enabled: false },
    local: { enabled: false },
    custom: { enabled: false },
  },
  runtime: {
    defaultRuntime: "fake",
    sddProvider: "openspec",
    requireSddChangeTraceability: false,
    executionEnvironment: {
      workspace: {},
      capabilities: [],
      network: {},
      secrets: {},
      confirmations: {},
    },
  },
};

const getConfigPaths = () => {
  const globalDir = join(homedir(), ".your-harness");
  const globalConfig = join(globalDir, "config.yml");
  const localConfig = join(process.cwd(), ".your-harness", "config.yml");

  return { globalDir, globalConfig, localConfig };
};

const loadConfigFile = (path: string): Partial<ValidatedConfig> => {
  if (!existsSync(path)) return {};

  const content = readFileSync(path, "utf-8");
  return parse(content) || {};
};

export interface ConfigLoadOptions {
  readonly globalConfigPath?: string;
  readonly localConfigPath?: string;
}

const mergeConfigs = (
  ...configs: Partial<ValidatedConfig>[]
): ValidatedConfig => {
  return configs.reduce<ValidatedConfig>((acc, config) => {
    const providers = { ...acc.providers };
    for (const [key, value] of Object.entries(config.providers ?? {})) {
      const providerType = key as ProviderType;
      providers[providerType] = {
        ...providers[providerType],
        ...value,
      };
    }

    return {
      ...acc,
      ...config,
      providers,
    };
  }, DEFAULT_CONFIG);
};

export const loadConfig = (options: ConfigLoadOptions = {}): ValidatedConfig => {
  const { globalDir, globalConfig, localConfig } = getConfigPaths();

  // Crear directorio global si no existe
  if (!existsSync(globalDir)) {
    mkdirSync(globalDir, { recursive: true });
  }

  const defaultConf = DEFAULT_CONFIG;
  const globalConf = loadConfigFile(options.globalConfigPath ?? globalConfig);
  const localConf = loadConfigFile(options.localConfigPath ?? localConfig);

  const merged = mergeConfigs(defaultConf, globalConf, localConf);

  // Cargar API keys de variables de entorno
  if (process.env.COPILOT_API_KEY && merged.providers.copilot)
    merged.providers.copilot.apiKey = process.env.COPILOT_API_KEY;
  if (process.env.CLAUDE_API_KEY && merged.providers.claude)
    merged.providers.claude.apiKey = process.env.CLAUDE_API_KEY;
  if (process.env.OPENAI_API_KEY && merged.providers.openai)
    merged.providers.openai.apiKey = process.env.OPENAI_API_KEY;

  return harnessConfigSchema.parse(merged);
};

export const saveConfig = (
  config: ValidatedConfig,
  scope: "global" | "local" = "global",
): void => {
  const { globalConfig, localConfig } = getConfigPaths();
  const path = scope === "global" ? globalConfig : localConfig;

  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(path, stringify(config), "utf-8");
};

export const getConfig = (): ValidatedConfig => {
  return loadConfig();
};
