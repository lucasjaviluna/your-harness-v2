import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PluginManifest, PluginInstance } from './types.js';

export interface PluginLoader {
  /** Carga un plugin desde una ruta local */
  loadFromPath(path: string): Promise<PluginInstance>;
  
  /** Carga un plugin desde un paquete npm instalado */
  loadFromPackage(packageName: string): Promise<PluginInstance>;
  
  /** Descubre plugins en un directorio */
  discoverPlugins(directory: string): Promise<PluginInstance[]>;
  
  /** Valida la estructura de un plugin */
  validatePlugin(path: string): boolean;
}

const MANIFEST_FILE = 'plugin.json';
const MANIFEST_FILES = ['plugin.json', 'plugin.yaml', 'plugin.yml'];

const loadManifest = (pluginPath: string): PluginManifest => {
  for (const file of MANIFEST_FILES) {
    const manifestPath = join(pluginPath, file);
    if (existsSync(manifestPath)) {
      const content = readFileSync(manifestPath, 'utf-8');
      if (file.endsWith('.json')) {
        return JSON.parse(content) as PluginManifest;
      }
      // YAML parsing se agregará después
      throw new Error(`YAML manifest not yet supported: ${file}`);
    }
  }
  
  throw new Error(`No manifest file found in ${pluginPath}`);
};

const resolveMain = (pluginPath: string, manifest: PluginManifest): string => {
  const mainPath = resolve(pluginPath, manifest.main);
  
  if (!existsSync(mainPath)) {
    // Intentar con extensiones
    for (const ext of ['.js', '.ts', '.mjs']) {
      const withExt = mainPath + ext;
      if (existsSync(withExt)) return withExt;
    }
    throw new Error(`Main entry point not found: ${manifest.main}`);
  }
  
  return mainPath;
};

export const createPluginLoader = (): PluginLoader => {
  return {
    async loadFromPath(path) {
      const resolvedPath = resolve(path);
      
      if (!existsSync(resolvedPath)) {
        throw new Error(`Plugin path does not exist: ${resolvedPath}`);
      }
      
      const stat = statSync(resolvedPath);
      if (!stat.isDirectory()) {
        throw new Error(`Plugin path must be a directory: ${resolvedPath}`);
      }
      
      const manifest = loadManifest(resolvedPath);
      const mainFile = resolveMain(resolvedPath, manifest);
      
      // Carga dinámica del módulo
      const fileUrl = pathToFileURL(mainFile).href;
      const module = await import(fileUrl);
      
      const instance: PluginInstance = {
        manifest,
        status: 'installed',
        installedAt: new Date(),
        path: resolvedPath,
        exports: module,
      };
      
      return instance;
    },

    async loadFromPackage(packageName) {
      try {
        // Resolver el paquete instalado
        const packagePath = dirname(require.resolve(packageName + '/package.json'));
        return this.loadFromPath(packagePath);
      } catch (error) {
        throw new Error(`Failed to load plugin package '${packageName}': ${(error as Error).message}`);
      }
    },

    async discoverPlugins(directory) {
      const resolvedDir = resolve(directory);
      
      if (!existsSync(resolvedDir)) {
        return [];
      }
      
      const entries = readdirSync(resolvedDir);
      const plugins: PluginInstance[] = [];
      
      for (const entry of entries) {
        const entryPath = join(resolvedDir, entry);
        const stat = statSync(entryPath);
        
        if (!stat.isDirectory()) continue;
        
        // Verificar si tiene manifest
        if (this.validatePlugin(entryPath)) {
          try {
            const plugin = await this.loadFromPath(entryPath);
            plugins.push(plugin);
          } catch (error) {
            console.error(`Failed to load plugin '${entry}':`, (error as Error).message);
          }
        }
      }
      
      return plugins;
    },

    validatePlugin(path) {
      return MANIFEST_FILES.some(file => existsSync(join(path, file)));
    },
  };
};