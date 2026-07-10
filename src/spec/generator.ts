import type {
  SpecDocument,
  SpecGenerationRequest,
  SpecGenerationResult,
  SpecGenerationTarget,
  GeneratedFile,
} from './types.js';

export interface SpecGenerator {
  /** Genera artefactos a partir de un documento de especificación */
  generate(request: SpecGenerationRequest): SpecGenerationResult;
  
  /** Registra un template para un target de generación */
  registerTemplate(target: SpecGenerationTarget, template: string): void;
}

const toPascalCase = (str: string): string => {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

const toCamelCase = (str: string): string => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const extractEntities = (document: SpecDocument): Array<{ name: string; fields: string[] }> => {
  const entities: Array<{ name: string; fields: string[] }> = [];
  
  const dataSection = document.sections.find(
    s => s.type === 'data-model'
  );
  
  if (dataSection) {
    // Parseo simple de entidades desde el contenido
    const lines = dataSection.content.split('\n');
    let currentEntity: { name: string; fields: string[] } | null = null;
    
    for (const line of lines) {
      const entityMatch = line.match(/^###?\s+(.+)/);
      const fieldMatch = line.match(/^[-*]\s+`?(\w+)`?\s*(?::\s*(\w+))?/);
      
      if (entityMatch) {
        if (currentEntity) {
          entities.push(currentEntity);
        }
        currentEntity = { name: entityMatch[1].trim(), fields: [] };
      } else if (fieldMatch && currentEntity) {
        currentEntity.fields.push(fieldMatch[1]);
      }
    }
    
    if (currentEntity) {
      entities.push(currentEntity);
    }
  }
  
  return entities;
};

const extractEndpoints = (document: SpecDocument): Array<{ method: string; path: string; description: string }> => {
  const endpoints: Array<{ method: string; path: string; description: string }> = [];
  
  const apiSection = document.sections.find(s => s.type === 'api');
  
  if (apiSection) {
    const lines = apiSection.content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+?)(?:\s*[-:]\s*(.+))?$/i);
      if (match) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2].trim(),
          description: match[3]?.trim() ?? '',
        });
      }
    }
  }
  
  return endpoints;
};

const generateTypeScriptTypes = (document: SpecDocument): GeneratedFile[] => {
  const entities = extractEntities(document);
  const files: GeneratedFile[] = [];
  
  if (entities.length === 0) return files;
  
  let content = '// Auto-generated from spec: ' + document.metadata.title + '\n';
  content += `// Version: ${document.metadata.version}\n`;
  content += `// Generated: ${new Date().toISOString()}\n\n`;
  
  for (const entity of entities) {
    const typeName = toPascalCase(entity.name);
    content += `export interface ${typeName} {\n`;
    
    for (const field of entity.fields) {
      const fieldName = toCamelCase(field);
      content += `  ${fieldName}: string; // TODO: Infer proper type\n`;
    }
    
    if (entity.fields.length === 0) {
      content += `  id: string;\n`;
    }
    
    content += '}\n\n';
  }
  
  files.push({
    path: `types/${toCamelCase(document.metadata.title)}.ts`,
    content,
    language: 'typescript',
    description: `TypeScript types for ${document.metadata.title}`,
  });
  
  return files;
};

const generateOpenApiSpec = (document: SpecDocument): GeneratedFile[] => {
  const endpoints = extractEndpoints(document);
  const files: GeneratedFile[] = [];
  
  const openApi: any = {
    openapi: '3.0.0',
    info: {
      title: document.metadata.title,
      version: document.metadata.version,
      description: document.metadata.description,
    },
    paths: {},
  };
  
  for (const endpoint of endpoints) {
    const method = endpoint.method.toLowerCase();
    
    if (!openApi.paths[endpoint.path]) {
      openApi.paths[endpoint.path] = {};
    }
    
    openApi.paths[endpoint.path][method] = {
      summary: endpoint.description,
      responses: {
        '200': {
          description: 'Successful response',
        },
      },
    };
  }
  
  files.push({
    path: 'openapi.json',
    content: JSON.stringify(openApi, null, 2),
    language: 'json',
    description: 'OpenAPI 3.0 specification',
  });
  
  return files;
};

const generateApiScaffold = (document: SpecDocument): GeneratedFile[] => {
  const endpoints = extractEndpoints(document);
  const files: GeneratedFile[] = [];
  
  if (endpoints.length === 0) return files;
  
  let content = '// Auto-generated API scaffold\n';
  content += `// ${document.metadata.title} v${document.metadata.version}\n\n`;
  content += 'import express from \'express\';\n\n';
  content += 'const router = express.Router();\n\n';
  
  for (const endpoint of endpoints) {
    const method = endpoint.method.toLowerCase();
    const handlerName = `${method}${toPascalCase(endpoint.path.replace(/[^a-zA-Z0-9]/g, '_'))}`;
    
    content += `// ${endpoint.description || endpoint.method + ' ' + endpoint.path}\n`;
    content += `router.${method}('${endpoint.path}', async (req, res) => {\n`;
    content += `  // TODO: Implement ${endpoint.method} ${endpoint.path}\n`;
    content += `  res.json({ message: '${handlerName}' });\n`;
    content += `});\n\n`;
  }
  
  content += 'export default router;\n';
  
  files.push({
    path: 'routes/api.ts',
    content,
    language: 'typescript',
    description: 'Express API scaffold',
  });
  
  return files;
};

const generateDataModels = (document: SpecDocument): GeneratedFile[] => {
  const entities = extractEntities(document);
  const files: GeneratedFile[] = [];
  
  if (entities.length === 0) return files;
  
  let content = '// Auto-generated data models\n';
  content += `// ${document.metadata.title} v${document.metadata.version}\n\n`;
  
  for (const entity of entities) {
    const className = toPascalCase(entity.name);
    content += `class ${className} {\n`;
    
    for (const field of entity.fields) {
      content += `  ${toCamelCase(field)}: string;\n`;
    }
    
    content += '\n  constructor(data: Partial<' + className + '>) {\n';
    content += '    Object.assign(this, data);\n';
    content += '  }\n\n';
    
    content += '  static fromJSON(json: Record<string, unknown>): ' + className + ' {\n';
    content += '    return new ' + className + '(json as any);\n';
    content += '  }\n\n';
    
    content += '  toJSON(): Record<string, unknown> {\n';
    content += '    return { ...this };\n';
    content += '  }\n';
    content += '}\n\n';
  }
  
  content += 'export { ' + entities.map(e => toPascalCase(e.name)).join(', ') + ' };\n';
  
  files.push({
    path: 'models/index.ts',
    content,
    language: 'typescript',
    description: 'Data model classes',
  });
  
  return files;
};

const generateTestTemplates = (document: SpecDocument): GeneratedFile[] => {
  const endpoints = extractEndpoints(document);
  const files: GeneratedFile[] = [];
  
  if (endpoints.length === 0) return files;
  
  let content = '// Auto-generated test templates\n';
  content += `// ${document.metadata.title} v${document.metadata.version}\n\n`;
  content += 'import { describe, it, expect } from \'vitest\';\n\n';
  
  for (const endpoint of endpoints) {
    const method = endpoint.method;
    content += `describe('${method} ${endpoint.path}', () => {\n`;
    content += `  it('should return 200', async () => {\n`;
    content += `    // TODO: Implement test for ${method} ${endpoint.path}\n`;
    content += `    expect(true).toBe(true);\n`;
    content += `  });\n\n`;
    content += `  it('should handle invalid input', async () => {\n`;
    content += `    // TODO: Test error handling\n`;
    content += `    expect(true).toBe(true);\n`;
    content += `  });\n`;
    content += `});\n\n`;
  }
  
  files.push({
    path: 'tests/api.test.ts',
    content,
    language: 'typescript',
    description: 'API test templates',
  });
  
  return files;
};

const generateDocumentation = (document: SpecDocument): GeneratedFile[] => {
  const files: GeneratedFile[] = [];
  
  let content = `# ${document.metadata.title}\n\n`;
  content += `**Version**: ${document.metadata.version}\n`;
  
  if (document.metadata.description) {
    content += `\n${document.metadata.description}\n`;
  }
  
  content += '\n---\n\n';
  
  for (const section of document.sections) {
    content += `## ${section.title}\n\n`;
    content += section.content + '\n\n';
    content += '---\n\n';
  }
  
  files.push({
    path: 'docs/README.md',
    content,
    language: 'markdown',
    description: 'Generated documentation',
  });
  
  return files;
};

const TARGET_GENERATORS: Record<SpecGenerationTarget, (doc: SpecDocument) => GeneratedFile[]> = {
  'typescript-types': generateTypeScriptTypes,
  'openapi-spec': generateOpenApiSpec,
  'api-scaffold': generateApiScaffold,
  'data-models': generateDataModels,
  'test-templates': generateTestTemplates,
  'documentation': generateDocumentation,
  'custom': () => [],
};

export const createSpecGenerator = (): SpecGenerator => {
  const customTemplates = new Map<SpecGenerationTarget, string>();

  return {
    generate(request) {
      const { spec, target, config } = request;
      const errors: string[] = [];
      const warnings: string[] = [];
      const files: GeneratedFile[] = [];

      try {
        // Usar template custom si existe
        if (customTemplates.has(target)) {
          const template = customTemplates.get(target)!;
          warnings.push(`Using custom template for target: ${target}`);
          
          files.push({
            path: config?.outputDir ?? 'output',
            content: template,
            language: 'text',
            description: `Custom template for ${target}`,
          });
        } else {
          const generator = TARGET_GENERATORS[target];
          if (generator) {
            const generatedFiles = generator(spec);
            
            // Aplicar outputDir si se especifica
            if (config?.outputDir) {
              for (const file of generatedFiles) {
                file.path = `${config.outputDir}/${file.path}`;
              }
            }
            
            files.push(...generatedFiles);
          } else {
            errors.push(`Unknown generation target: ${target}`);
          }
        }
      } catch (error) {
        errors.push(`Generation failed: ${(error as Error).message}`);
      }

      return {
        success: errors.length === 0,
        target,
        files,
        errors,
        warnings,
      };
    },

    registerTemplate(target, template) {
      customTemplates.set(target, template);
    },
  };
};