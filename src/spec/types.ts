export type SpecFormat = 'openspec' | 'markdown' | 'yaml' | 'json';

export type SpecSectionType = 
  | 'overview'
  | 'requirements'
  | 'architecture'
  | 'api'
  | 'data-model'
  | 'components'
  | 'workflows'
  | 'testing'
  | 'deployment'
  | 'custom';

export interface SpecDocument {
  /** Metadata del documento */
  metadata: SpecMetadata;
  
  /** Secciones del documento */
  sections: SpecSection[];
  
  /** Referencias cruzadas */
  references?: SpecReference[];
  
  /** Ruta del archivo fuente */
  sourcePath?: string;
  
  /** Formato original */
  format: SpecFormat;
}

export interface SpecMetadata {
  title: string;
  version: string;
  description?: string;
  authors?: string[];
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  project?: string;
  format: SpecFormat;
}

export interface SpecSection {
  id: string;
  type: SpecSectionType;
  title: string;
  content: string;
  order: number;
  
  /** Sub-secciones */
  children?: SpecSection[];
  
  /** Validaciones asociadas a esta sección */
  validations?: SpecValidation[];
  
  /** Metadata de la sección */
  metadata?: Record<string, unknown>;
}

export interface SpecValidation {
  id: string;
  type: 'schema' | 'rule' | 'custom';
  description: string;
  
  /** Schema JSON para validación de tipo 'schema' */
  schema?: Record<string, unknown>;
  
  /** Regla expresada como string para tipo 'rule' */
  rule?: string;
  
  /** Severidad del fallo de validación */
  severity: 'error' | 'warning' | 'info';
}

export interface SpecReference {
  source: string;       // Referencia origen (sectionId o path)
  target: string;       // Referencia destino
  type: 'depends-on' | 'implements' | 'relates-to' | 'documents';
  description?: string;
}

export interface SpecParseResult {
  success: boolean;
  document?: SpecDocument;
  errors: SpecParseError[];
  warnings: SpecParseWarning[];
}

export interface SpecParseError {
  line?: number;
  column?: number;
  message: string;
  section?: string;
}

export interface SpecParseWarning {
  line?: number;
  message: string;
  suggestion?: string;
}

export interface SpecValidationResult {
  valid: boolean;
  document: SpecDocument;
  errors: SpecValidationError[];
  warnings: SpecValidationWarning[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface SpecValidationError {
  validationId: string;
  sectionId: string;
  message: string;
  severity: 'error';
  location?: string;
}

export interface SpecValidationWarning {
  validationId: string;
  sectionId: string;
  message: string;
  severity: 'warning' | 'info';
  suggestion?: string;
}

export interface SpecGenerationRequest {
  /** Documento de especificación fuente */
  spec: SpecDocument;
  
  /** Tipo de artefacto a generar */
  target: SpecGenerationTarget;
  
  /** Configuración del generador */
  config?: {
    language?: string;
    framework?: string;
    outputDir?: string;
    templates?: Record<string, string>;
    options?: Record<string, unknown>;
  };
}

export type SpecGenerationTarget = 
  | 'api-scaffold'
  | 'data-models'
  | 'typescript-types'
  | 'openapi-spec'
  | 'test-templates'
  | 'documentation'
  | 'custom';

export interface SpecGenerationResult {
  success: boolean;
  target: SpecGenerationTarget;
  files: GeneratedFile[];
  errors: string[];
  warnings: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  description?: string;
}

export interface OpenSpecConfig {
  /** Versión del formato OpenSpec */
  version: string;
  
  /** Secciones requeridas */
  requiredSections: SpecSectionType[];
  
  /** Schemas de validación por sección */
  schemas: Record<string, Record<string, unknown>>;
  
  /** Templates de generación */
  templates: Record<SpecGenerationTarget, string>;
}