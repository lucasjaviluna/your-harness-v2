import type { SkillDefinition } from '../types.js';

export const codeReviewSkill: SkillDefinition = {
  name: 'code-review',
  description: 'Revisa código en busca de bugs, problemas de seguridad, estilo y mejores prácticas',
  version: '0.1.0',
  category: 'code-review',

  systemPrompt: `Eres un revisor de código experto. Al revisar código:
- Identifica bugs, vulnerabilidades de seguridad y problemas de rendimiento
- Sugiere mejoras de legibilidad y mantenibilidad
- Verifica adherencia a patrones y convenciones
- Sé específico: indica archivo, línea y sugerencia concreta
- Prioriza issues: crítico > alto > medio > bajo
- Proporciona ejemplos de código para las correcciones sugeridas`,

  tools: [
    {
      name: 'review_file',
      description: 'Revisa un archivo de código y genera un reporte estructurado',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Ruta del archivo a revisar',
          },
          content: {
            type: 'string',
            description: 'Contenido del archivo',
          },
          language: {
            type: 'string',
            description: 'Lenguaje de programación',
          },
          focus: {
            type: 'array',
            items: { type: 'string' },
            description: 'Áreas de enfoque: security, performance, style, bugs, architecture',
          },
        },
        required: ['filePath', 'content'],
      },
    },
  ],

  templates: [
    {
      name: 'full-review',
      description: 'Revisión completa de un archivo',
      variables: ['filePath', 'content', 'language'],
      messages: [
        {
          role: 'user',
          content: `Por favor revisa el siguiente archivo {{language}}:

**Archivo**: {{filePath}}

\`\`\`{{language}}
{{content}}
\`\`\`

Proporciona un reporte estructurado con:
1. Resumen general
2. Issues encontrados (priorizados)
3. Sugerencias de mejora
4. Puntuación general (1-10)`,
        },
      ],
    },
    {
      name: 'security-check',
      description: 'Revisión enfocada en seguridad',
      variables: ['filePath', 'content', 'language'],
      messages: [
        {
          role: 'user',
          content: `Revisa la seguridad del siguiente código {{language}}:

**Archivo**: {{filePath}}

\`\`\`{{language}}
{{content}}
\`\`\`

Enfócate en:
- Vulnerabilidades OWASP Top 10
- Inyección (SQL, XSS, command)
- Manejo inseguro de datos
- Autenticación y autorización
- Exposición de información sensible`,
        },
      ],
    },
    {
      name: 'quick-scan',
      description: 'Escaneo rápido de issues obvios',
      variables: ['filePath', 'content', 'language'],
      messages: [
        {
          role: 'user',
          content: `Escaneo rápido de {{filePath}}:

\`\`\`{{language}}
{{content}}
\`\`\`

Solo reporta issues críticos o bugs evidentes. Sé breve.`,
        },
      ],
    },
  ],

  requires: [],
};

export default codeReviewSkill;