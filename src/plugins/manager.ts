import type { PluginInstance, PluginStatus, PluginHook, PluginContext } from './types.js';
import type { PluginLoader } from './loader.js';
import type { ConnectorMetadata } from '../../core/connector.js';

export interface PluginManager {
  /** Instala un plugin desde una ruta */
  install(path: string): Promise<PluginInstance>;
  
  /** Instala un plugin desde un paquete npm */
  installPackage(packageName: string): Promise<PluginInstance>;
  
  /** Habilita un plugin instalado */
  enable(name: string): Promise<void>;
  
  /** Deshabilita un plugin */
  disable(name: string): Promise<void>;
  
  /** Desinstala un plugin */
  uninstall(name: string): Promise<void>;
  
  /** Lista todos los plugins */
  list(): PluginInstance[];
  
  /** Lista plugins por estado */
  listByStatus(status: PluginStatus): PluginInstance[];
  
  /** Obtiene un plugin por nombre */
  get(name: string): PluginInstance | undefined;
  
  /** Descubre e instala plugins desde un directorio */
  discover(directory: string): Promise<PluginInstance[]>;
}

export const createPluginManager = (loader: PluginLoader): PluginManager => {
  const plugins = new Map<string, PluginInstance>();

  const invokeHook = async (
    instance: PluginInstance,
    hookName: keyof PluginHook,
    context: PluginContext
  ) => {
    const hooks = instance.exports?.[hookName] as PluginHook[keyof PluginHook] | undefined;
    if (hooks) {
      await hooks(context);
    }
  };

  const buildContext = (): PluginContext => ({
    plugins: Array.from(plugins.values()),
    config: {},
    metadata: {
      name: 'plugin-manager',
      version: '0.1.0',
      type: 'plugin',
      description: 'Plugin manager context',
    },
  });

  return {
    async install(path) {
      const instance = await loader.loadFromPath(path);
      
      if (plugins.has(instance.manifest.name)) {
        throw new Error(`Plugin '${instance.manifest.name}' is already installed`);
      }
      
      instance.status = 'installed';
      plugins.set(instance.manifest.name, instance);
      
      const context = buildContext();
      await invokeHook(instance, 'onInstall', context);
      
      return instance;
    },

    async installPackage(packageName) {
      const instance = await loader.loadFromPackage(packageName);
      
      if (plugins.has(instance.manifest.name)) {
        throw new Error(`Plugin '${instance.manifest.name}' is already installed`);
      }
      
      instance.status = 'installed';
      plugins.set(instance.manifest.name, instance);
      
      const context = buildContext();
      await invokeHook(instance, 'onInstall', context);
      
      return instance;
    },

    async enable(name) {
      const instance = plugins.get(name);
      if (!instance) {
        throw new Error(`Plugin '${name}' not found`);
      }
      
      if (instance.status === 'enabled') {
        return; // Ya está habilitado
      }
      
      instance.status = 'enabled';
      instance.enabledAt = new Date();
      
      const context = buildContext();
      await invokeHook(instance, 'onEnable', context);
    },

    async disable(name) {
      const instance = plugins.get(name);
      if (!instance) {
        throw new Error(`Plugin '${name}' not found`);
      }
      
      if (instance.status === 'disabled') {
        return; // Ya está deshabilitado
      }
      
      instance.status = 'disabled';
      
      const context = buildContext();
      await invokeHook(instance, 'onDisable', context);
    },

    async uninstall(name) {
      const instance = plugins.get(name);
      if (!instance) {
        throw new Error(`Plugin '${name}' not found`);
      }
      
      const context = buildContext();
      await invokeHook(instance, 'onUninstall', context);
      
      plugins.delete(name);
    },

    list() {
      return Array.from(plugins.values());
    },

    listByStatus(status) {
      return Array.from(plugins.values()).filter(p => p.status === status);
    },

    get(name) {
      return plugins.get(name);
    },

    async discover(directory) {
      const discovered = await loader.discoverPlugins(directory);
      
      for (const instance of discovered) {
        if (!plugins.has(instance.manifest.name)) {
          plugins.set(instance.manifest.name, instance);
          
          const context = buildContext();
          await invokeHook(instance, 'onInstall', context);
        }
      }
      
      return discovered;
    },
  };
};