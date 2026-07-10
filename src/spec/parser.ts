import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { 
  SpecDocument, 
  SpecSection, 
  SpecMetadata, 
  SpecParseResult, 
  SpecParseError,
  SpecFormat,
  SpecSectionType,
  SpecParseWarning 
} from './types.js';

export interface SpecParser {
  /** Parsea un archivo de especificación */
  parseFile(path: string): SpecParseResult;
  
  /** Parsea un string de especificación */
  parseString(content: string, format: SpecFormat): SpecParseResult;
  
  /** Detecta el formato de un archivo */
  detectFormat(path: string): SpecFormat;
}

const SECTION_HEADER_REGEX = /^##\s+(.+?)(?:\s*\{([^}]+)\})?\s*$/;
const YAML_FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

const parseMarkdownSpec = (content: string): SpecParseResult => {
  const errors: SpecParseError[] = [];
  const warnings: SpecParseWarning[] = [];

  // Extraer frontmatter YAML
  let metadata: SpecMetadata = {
    title: 'Untitled Spec',
    version: '0.1.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    format: 'markdown',
  };

  const frontmatterMatch = content.match(YAML_FRONTMATTER_REGEX);
  let bodyContent = content;

  if (frontmatterMatch) {
    try {
      const frontmatter = parseYaml(frontmatterMatch[1]) as any;
      metadata = {
        title: frontmatter.title ?? metadata.title,
        version: frontmatter.version ?? metadata.version,
        description: frontmatter.description,
        authors: frontmatter.authors,
        createdAt: frontmatter.createdAt ? new Date(frontmatter.createdAt) : new Date(),
        updatedAt: frontmatter.updatedAt ? new Date(frontmatter.updatedAt) : new Date(),
        tags: frontmatter.tags,
        project: frontmatter.project,
        format: 'markdown',
      };
      bodyContent = content.slice(frontmatterMatch[0].length);
    } catch (error) {
      errors.push({
        message: `Invalid YAML frontmatter: ${(error as Error).message}`,
      });
    }
  }

  // Parsear secciones desde encabezados ##
  const lines = bodyContent.split('\n');
  const sections: SpecSection[] = [];
  let currentSection: SpecSection | null = null;
  let sectionOrder = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(SECTION_HEADER_REGEX);

    if (match) {
      // Guardar sección anterior
      if (currentSection) {
        sections.push(currentSection);
      }

      const title = match[1].trim();
      const attributes = match[2] ?? '';
      const type = parseSectionType(title, attributes);

      currentSection = {
        id: slugify(title),
        type,
        title,
        content: '',
        order: sectionOrder++,
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  // No olvidar la última sección
  if (currentSection) {
    sections.push(currentSection);
  }

  // Si no se encontraron secciones, crear una por defecto
  if (sections.length === 0) {
    sections.push({
      id: 'overview',
      type: 'overview',
      title: 'Overview',
      content: bodyContent.trim(),
      order: 0,
    });
  }

  return {
    success: errors.length === 0,
    document: {
      metadata,
      sections,
      sourcePath: undefined,
      format: 'markdown',
    },
    errors,
    warnings,
  };
};

const parseYamlSpec = (content: string): SpecParseResult => {
  const errors: SpecParseError[] = [];
  const warnings: SpecParseWarning[] = [];

  try {
    const parsed = parseYaml(content) as any;
    
    const metadata: SpecMetadata = {
      title: parsed.title ?? 'Untitled Spec',
      version: parsed.version ?? '0.1.0',
      description: parsed.description,
      authors: parsed.authors,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
      updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
      tags: parsed.tags,
      project: parsed.project,
      format: 'yaml',
    };

    const sections: SpecSection[] = (parsed.sections ?? []).map((s: any, index: number) => ({
      id: s.id ?? slugify(s.title ?? `section-${index}`),
      type: (s.type as SpecSectionType) ?? 'custom',
      title: s.title ?? `Section ${index + 1}`,
      content: s.content ?? '',
      order: s.order ?? index,
      validations: s.validations,
      metadata: s.metadata,
    }));

    return {
      success: true,
      document: {
        metadata,
        sections,
        format: 'yaml',
      },
      errors,
      warnings,
    };
  } catch (error) {
    errors.push({
      message: `YAML parse error: ${(error as Error).message}`,
    });
    
    return {
      success: false,
      errors,
      warnings,
    };
  }
};

const parseJsonSpec = (content: string): SpecParseResult => {
  const errors: SpecParseError[] = [];
  const warnings: SpecParseWarning[] = [];

  try {
    const parsed = JSON.parse(content);
    
    // JSON se parsea igual que YAML
    const yamlString = JSON.stringify(parsed);
    // Reutilizar lógica YAML
    const result = parseYamlSpec(yamlString);
    if (result.document) {
      result.document.format = 'json';
      result.document.metadata.format = 'json';
    }
    return result;
  } catch (error) {
    errors.push({
      message: `JSON parse error: ${(error as Error).message}`,
    });
    
    return {
      success: false,
      errors,
      warnings,
    };
  }
};

const parseSectionType = (title: string, attributes: string): SpecSectionType => {
  const titleLower = title.toLowerCase();
  
  // Intentar inferir por nombre de sección
  if (titleLower.includes('overview') || titleLower.includes('resumen')) return 'overview';
  if (titleLower.includes('requirement') || titleLower.includes('requisito')) return 'requirements';
  if (titleLower.includes('architect') || titleLower.includes('arquitect')) return 'architecture';
  if (titleLower.includes('api') || titleLower.includes('endpoint')) return 'api';
  if (titleLower.includes('data') || titleLower.includes('model') || titleLower.includes('datos')) return 'data-model';
  if (titleLower.includes('component') || titleLower.includes('componente')) return 'components';
  if (titleLower.includes('workflow') || titleLower.includes('flujo')) return 'workflows';
  if (titleLower.includes('test') || titleLower.includes('prueba')) return 'testing';
  if (titleLower.includes('deploy') || titleLower.includes('desplieg')) return 'deployment';

  // Intentar extraer de atributos {type: api}
  const typeMatch = attributes.match(/type:\s*(\w+)/);
  if (typeMatch) {
    const type = typeMatch[1].toLowerCase() as SpecSectionType;
    if (isValidSectionType(type)) return type;
  }

  return 'custom';
};

const isValidSectionType = (type: string): type is SpecSectionType => {
  const validTypes: SpecSectionType[] = [
    'overview', 'requirements', 'architecture', 'api', 
    'data-model', 'components', 'workflows', 'testing', 
    'deployment', 'custom'
  ];
  return validTypes.includes(type as SpecSectionType);
};

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

export const createSpecParser = (): SpecParser => {
  return {
    parseFile(path) {
      if (!existsSync(path)) {
        return {
          success: false,
          errors: [{ message: `File not found: ${path}` }],
          warnings: [],
        };
      }

      const format = this.detectFormat(path);
      const content = readFileSync(path, 'utf-8');
      const result = this.parseString(content, format);
      
      if (result.document) {
        result.document.sourcePath = path;
      }
      
      return result;
    },

    parseString(content, format) {
      switch (format) {
        case 'markdown':
        case 'openspec':
          return parseMarkdownSpec(content);
        case 'yaml':
          return parseYamlSpec(content);
        case 'json':
          return parseJsonSpec(content);
        default:
          return {
            success: false,
            errors: [{ message: `Unsupported format: ${format}` }],
            warnings: [],
          };
      }
    },

    detectFormat(path) {
      const ext = path.split('.').pop()?.toLowerCase();
      
      switch (ext) {
        case 'md':
        case 'markdown':
          return 'markdown';
        case 'yaml':
        case 'yml':
          return 'yaml';
        case 'json':
          return 'json';
        case 'spec':
        case 'openspec':
          return 'openspec';
        default:
          return 'markdown'; // Default a markdown
      }
    },
  };
};