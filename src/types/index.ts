// Tipos base del sistema your-harness

export type ProviderType = 'copilot' | 'claude' | 'openai' | 'local' | 'custom';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type ModeType = 'frontend' | 'backend' | 'devops' | 'testing' | 'analysis' | 'custom';

export interface HarnessConfig {
  version: string;
  defaultProvider: ProviderType;
  logLevel: LogLevel;
  mode: ModeType;
  providers: Record<ProviderType, ProviderConfig>;
  plugins?: PluginEntry[];
  mcpServers?: MCPServerEntry[];
}

export interface ProviderConfig {
  enabled: boolean;
  apiKey?: string;
  model?: string;
  endpoint?: string;
  options?: Record<string, unknown>;
}

export interface PluginEntry {
  name: string;
  version: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface MCPServerEntry {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface CommandContext {
  config: HarnessConfig;
  cwd: string;
  sessionId?: string;
}

export interface SessionContext {
  id: string;
  project: string;
  mode: ModeType;
  provider: ProviderType;
  startedAt: Date;
  mcpServers: string[];
}