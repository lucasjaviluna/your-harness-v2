import type { ConnectorMetadata } from '../../core/connector.js';

export type PluginStatus = 'installed' | 'enabled' | 'disabled' | 'error';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  main: string;           // Entry point relativo al plugin
  type: PluginType;
  dependencies?: Record<string, string>;
  commands?: PluginCommand[];
  skills?: string[];       // Skills que provee el plugin
  config?: Record<string, unknown>;
}

export type PluginType = 'tool' | 'skill-pack' | 'workflow' | 'connector' | 'custom';

export interface PluginCommand {
  name: string;
  description: string;
  action: string;         // Función exportada en main
}

export interface PluginInstance {
  manifest: PluginManifest;
  status: PluginStatus;
  installedAt: Date;
  enabledAt?: Date;
  path: string;           // Ruta en disco
  exports?: Record<string, unknown>; // Lo que exporta el entry point
}

export interface PluginContext {
  plugins: PluginInstance[];
  config: Record<string, unknown>;
  metadata: ConnectorMetadata;
}

export interface PluginHook {
  onInstall?: (context: PluginContext) => Promise<void>;
  onEnable?: (context: PluginContext) => Promise<void>;
  onDisable?: (context: PluginContext) => Promise<void>;
  onUninstall?: (context: PluginContext) => Promise<void>;
}