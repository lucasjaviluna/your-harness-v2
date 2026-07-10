import { z } from 'zod';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { parse } from 'yaml';
import dotenv from 'dotenv';
import type { HarnessConfig, LogLevel, ModeType, ProviderType } from '../types/index.js';

dotenv.config();

// Schema de validación
const providerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  endpoint: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

const harnessConfigSchema = z.object({
  version: z.string().default('0.1.0'),
  defaultProvider: z.enum(['copilot', 'claude', 'openai', 'local', 'custom']).default('claude'),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  mode: z.enum(['frontend', 'backend', 'devops', 'testing', 'analysis', 'custom']).default('custom'),
  providers: z.record(z.enum(['copilot', 'claude', 'openai', 'local', 'custom']), providerConfigSchema).default({}),
  plugins: z.array(z.object({
    name: z.string(),
    version: z.string(),
    enabled: z.boolean(),
    config: z.record(z.unknown()).optional(),
  })).optional(),
  mcpServers: z.array(z.object({
    name: z.string(),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    enabled: z.boolean(),
  })).optional(),
});

export type ValidatedConfig = z.infer<typeof harnessConfigSchema>;

const DEFAULT_CONFIG: ValidatedConfig = {
  version: '0.1.0',
  defaultProvider: 'claude',
  logLevel: 'info',
  mode: 'custom',
  providers: {
    copilot: { enabled: false },
    claude: { enabled: false },
    openai: { enabled: false },
    local: { enabled: false },
    custom: { enabled: false },
  },
};

const getConfigPaths = () => {
  const globalDir = join(homedir(), '.your-harness');
  const globalConfig = join(globalDir, 'config.yml');
  const localConfig = join(process.cwd(), '.your-harness', 'config.yml');
  
  return { globalDir, globalConfig, localConfig };
};

const loadConfigFile = (path: string): Partial<ValidatedConfig> => {
  if (!existsSync(path)) return {};
  
  const content = readFileSync(path, 'utf-8');
  return parse(content) || {};
};

const mergeConfigs = (...configs: Partial<ValidatedConfig>[]): ValidatedConfig => {
  return configs.reduce((acc, config) => {
    return {
      ...acc,
      ...config,
      providers: {
        ...acc.providers,
        ...Object.entries(config.providers || {}).reduce((providers, [key, value]) => ({
          ...providers,
          [key]: { ...acc.providers?.[key as ProviderType], ...value },
        }), {}),
      },
    };
  }, DEFAULT_CONFIG);
};

export const loadConfig = (): ValidatedConfig => {
  const { globalDir, globalConfig, localConfig } = getConfigPaths();
  
  // Crear directorio global si no existe
  if (!existsSync(globalDir)) {
    mkdirSync(globalDir, { recursive: true });
  }
  
  const defaultConf = DEFAULT_CONFIG;
  const globalConf = loadConfigFile(globalConfig);
  const localConf = loadConfigFile(localConfig);
  
  const merged = mergeConfigs(defaultConf, globalConf, localConf);
  
  // Cargar API keys de variables de entorno
  if (process.env.COPILOT_API_KEY) merged.providers.copilot.apiKey = process.env.COPILOT_API_KEY;
  if (process.env.CLAUDE_API_KEY) merged.providers.claude.apiKey = process.env.CLAUDE_API_KEY;
  if (process.env.OPENAI_API_KEY) merged.providers.openai.apiKey = process.env.OPENAI_API_KEY;
  
  return harnessConfigSchema.parse(merged);
};

export const saveConfig = (config: ValidatedConfig, scope: 'global' | 'local' = 'global'): void => {
  const { globalConfig, localConfig } = getConfigPaths();
  const path = scope === 'global' ? globalConfig : localConfig;
  
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  // TODO: Convertir a YAML
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
};

export const getConfig = (): ValidatedConfig => {
  return loadConfig();
};