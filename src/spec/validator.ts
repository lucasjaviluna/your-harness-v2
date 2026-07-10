import type { 
  SpecDocument, 
  SpecSection, 
  SpecValidation, 
  SpecValidationResult, 
  SpecValidationError, 
  SpecValidationWarning,
  SpecSectionType 
} from './types.js';

export interface SpecValidator {
  /** Valida un documento completo */
  validate(document: SpecDocument): SpecValidationResult;
  
  /** Valida una sección específica */
  validateSection(section: SpecSection, validations: SpecValidation[]): {
    errors: SpecValidationError[];
    warnings: SpecValidationWarning[];
  };
  
  /** Registra un schema de validación para un tipo de sección */
  registerSchema(sectionType: SpecSectionType, schema: Record<string, unknown>): void;
  
  /** Registra una regla de validación */
  registerRule(id: string, rule: (section: SpecSection) => string | null): void;
}

const DEFAULT_SCHEMAS: Record<string, Record<string, unknown>> = {
  overview: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1 },
      description: { type: 'string' },
    },
  },
  api: {
    type: 'object',
    required: ['endpoints'],
    properties: {
      endpoints: { type: 'array', minItems: 1 },
      authentication: { type: 'string' },
      baseUrl: { type: 'string' },
    },
  },
  'data-model': {
    type: 'object',
    required: ['entities'],
    properties: {
      entities: { type: 'array', minItems: 1 },
      relationships: { type: 'array' },
    },
  },
};

const DEFAULT_RULES: Record<string, (section: SpecSection, document: SpecDocument) => string | null> = {
  'section-not-empty': (section) => {
    if (!section.content || section.content.trim().length === 0) {
      return `Section '${section.title}' is empty`;
    }
    return null;
  },
  'has-overview': (_, document) => {
    const hasOverview = document.sections.some(s => s.type === 'overview');
    if (!hasOverview) {
      return 'Document is missing an overview section';
    }
    return null;
  },
  'has-requirements': (_, document) => {
    const hasReqs = document.sections.some(
      s => s.type === 'requirements' || s.type === 'overview'
    );
    if (!hasReqs) {
      return 'Document should have a requirements or overview section';
    }
    return null;
  },
  'version-format': (_, document) => {
    const version = document.metadata.version;
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
    if (!semverRegex.test(version)) {
      return `Version '${version}' does not follow semver format`;
    }
    return null;
  },
};

const validateJsonSchema = (
  content: string, 
  schema: Record<string, unknown>
): string[] => {
  const errors: string[] = [];

  try {
    // Validación simple de schema
    // En producción usar ajv o similar
    const parsed = JSON.parse(content);
    
    if (schema.type === 'object' && typeof parsed !== 'object') {
      errors.push('Content must be a valid JSON object');
      return errors;
    }

    if (schema.required) {
      for (const field of schema.required as string[]) {
        if (!(field in parsed)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    if (schema.properties) {
      const props = schema.properties as Record<string, any>;
      for (const [key, propSchema] of Object.entries(props)) {
        if (key in parsed) {
          const value = parsed[key];
          
          if (propSchema.type === 'string' && typeof value !== 'string') {
            errors.push(`Field '${key}' must be a string`);
          }
          
          if (propSchema.type === 'array' && !Array.isArray(value)) {
            errors.push(`Field '${key}' must be an array`);
          }

          if (propSchema.minLength && typeof value === 'string' && value.length < propSchema.minLength) {
            errors.push(`Field '${key}' must be at least ${propSchema.minLength} characters`);
          }

          if (propSchema.minItems && Array.isArray(value) && value.length < propSchema.minItems) {
            errors.push(`Field '${key}' must have at least ${propSchema.minItems} items`);
          }
        }
      }
    }
  } catch {
    errors.push('Content is not valid JSON');
  }

  return errors;
};

export const createSpecValidator = (): SpecValidator => {
  const schemas = new Map<string, Record<string, unknown>>(
    Object.entries(DEFAULT_SCHEMAS)
  );
  const rules = new Map<string, (section: SpecSection, document: SpecDocument) => string | null>(
    Object.entries(DEFAULT_RULES)
  );

  return {
    validate(document) {
      const errors: SpecValidationError[] = [];
      const warnings: SpecValidationWarning[] = [];

      // Validar reglas globales
      for (const [ruleId, ruleFn] of rules) {
        // Aplicar a cada sección si la regla aplica a secciones
        for (const section of document.sections) {
          const error = ruleFn(section, document);
          if (error) {
            if (ruleId === 'section-not-empty') {
              warnings.push({
                validationId: ruleId,
                sectionId: section.id,
                message: error,
                severity: 'warning',
              });
            } else {
              warnings.push({
                validationId: ruleId,
                sectionId: section.id,
                message: error,
                severity: 'warning',
              });
            }
          }
        }

        // Aplicar reglas de documento
        const docError = ruleFn({ id: 'document', type: 'custom', title: 'Document', content: '', order: -1 }, document);
        if (docError) {
          warnings.push({
            validationId: ruleId,
            sectionId: 'document',
            message: docError,
            severity: 'warning',
            suggestion: 'Review the specification structure',
          });
        }
      }

      // Validar cada sección
      for (const section of document.sections) {
        // Validar contra schema del tipo de sección
        const schema = schemas.get(section.type);
        if (schema) {
          const schemaErrors = validateJsonSchema(section.content, schema);
          for (const schemaError of schemaErrors) {
            errors.push({
              validationId: `schema:${section.type}`,
              sectionId: section.id,
              message: schemaError,
              severity: 'error',
              location: `Section: ${section.title}`,
            });
          }
        }

        // Validar contra validaciones definidas en la sección
        if (section.validations) {
          const sectionResult = this.validateSection(section, section.validations);
          errors.push(...sectionResult.errors);
          warnings.push(...sectionResult.warnings);
        }
      }

      const total = errors.length + warnings.length;
      const passed = total === 0 ? 1 : 0;

      return {
        valid: errors.length === 0,
        document,
        errors,
        warnings,
        summary: {
          total: document.sections.length,
          passed,
          failed: errors.length,
          warnings: warnings.length,
        },
      };
    },

    validateSection(section, validations) {
      const errors: SpecValidationError[] = [];
      const warnings: SpecValidationWarning[] = [];

      for (const validation of validations) {
        if (validation.type === 'schema' && validation.schema) {
          const schemaErrors = validateJsonSchema(section.content, validation.schema);
          for (const schemaError of schemaErrors) {
            if (validation.severity === 'error') {
              errors.push({
                validationId: validation.id,
                sectionId: section.id,
                message: schemaError,
                severity: 'error',
                location: `Section: ${section.title}`,
              });
            } else {
              warnings.push({
                validationId: validation.id,
                sectionId: section.id,
                message: schemaError,
                severity: validation.severity as 'warning' | 'info',
                suggestion: validation.description,
              });
            }
          }
        }

        if (validation.type === 'rule' && validation.rule) {
          const rulePassed = evaluateSimpleRule(validation.rule, section);
          if (!rulePassed) {
            if (validation.severity === 'error') {
              errors.push({
                validationId: validation.id,
                sectionId: section.id,
                message: `Rule failed: ${validation.description}`,
                severity: 'error',
              });
            } else {
              warnings.push({
                validationId: validation.id,
                sectionId: section.id,
                message: `Rule warning: ${validation.description}`,
                severity: validation.severity as 'warning' | 'info',
              });
            }
          }
        }
      }

      return { errors, warnings };
    },

    registerSchema(sectionType, schema) {
      schemas.set(sectionType, schema);
    },

    registerRule(id, rule) {
      rules.set(id, (section, document) => rule(section));
    },
  };
};

const evaluateSimpleRule = (rule: string, section: SpecSection): boolean => {
  // Evaluador simple de reglas
  if (rule === 'non-empty') {
    return section.content.trim().length > 0;
  }
  
  if (rule.startsWith('min-length:')) {
    const minLength = parseInt(rule.split(':')[1], 10);
    return section.content.trim().length >= minLength;
  }
  
  if (rule.startsWith('contains:')) {
    const keyword = rule.split(':')[1];
    return section.content.includes(keyword);
  }
  
  if (rule === 'has-children') {
    return (section.children?.length ?? 0) > 0;
  }

  return true;
};