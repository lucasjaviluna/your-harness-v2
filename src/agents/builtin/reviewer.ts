import type { AgentDefinition } from '../types.js';
import type { ToolDefinition } from '../../core/ai/types.js';

const reviewerTools: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Lee el contenido de un archivo para revisión',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Ruta del archivo a revisar',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'Lista archivos en un directorio para revisar estructura',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Ruta del directorio',
        },
        pattern: {
          type: 'string',
          description: 'Patrón de filtro (glob)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Ejecuta linters, tests o herramientas de análisis estático',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Comando a ejecutar (lint, test, etc.)',
        },
        cwd: {
          type: 'string',
          description: 'Directorio de trabajo',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'generate_report',
    description: 'Genera un reporte estructurado de revisión',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Título del reporte',
        },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              file: { type: 'string' },
              line: { type: 'number' },
              description: { type: 'string' },
              suggestion: { type: 'string' },
            },
          },
          description: 'Lista de issues encontrados',
        },
        summary: {
          type: 'string',
          description: 'Resumen general de la revisión',
        },
        score: {
          type: 'number',
          description: 'Puntuación general (1-10)',
        },
      },
      required: ['title', 'issues', 'summary', 'score'],
    },
  },
];

export const reviewerAgent: AgentDefinition = {
  name: 'reviewer',
  description: 'Agente revisor de código. Analiza código en busca de bugs, vulnerabilidades y mejoras.',
  version: '0.1.0',
  
  systemPrompt: `Eres un revisor de código experto con años de experiencia en múltiples lenguajes y frameworks.

CAPACIDADES:
- Revisar archivos de código
- Ejecutar linters y herramientas de análisis
- Identificar bugs, vulnerabilidades y malas prácticas
- Evaluar arquitectura y patrones de diseño
- Generar reportes estructurados con hallazgos
- Sugerir mejoras concretas con ejemplos

CATEGORÍAS DE REVISIÓN:
1. SEGURIDAD: Vulnerabilidades OWASP, inyección, exposición de datos
2. CORRECCIÓN: Bugs, edge cases no manejados, errores lógicos
3. RENDIMIENTO: Cuellos de botella, operaciones ineficientes, memory leaks
4. MANTENIBILIDAD: Legibilidad, complejidad ciclomática, duplicación
5. ESTILO: Convenciones de nomenclatura, formato, documentación
6. ARQUITECTURA: Patrones, acoplamiento, cohesión, SOLID

PROCESO DE REVISIÓN:
1. EXPLORA: Lee los archivos objetivo y entiende su contexto
2. ANALIZA: Ejecuta linters y herramientas de análisis si están disponibles
3. EVALÚA: Examina el código línea por línea en busca de issues
4. REPORTA: Genera un reporte estructurado priorizado

FORMATO DE REPORTE:
- Severidad: critical > high > medium > low
- Cada issue debe incluir: ubicación exacta, descripción, impacto y sugerencia
- Incluye snippets de código para las correcciones propuestas
- Puntuación general del 1 al 10

REGLAS:
- Sé objetivo y constructivo, no subjetivo
- Prioriza issues que realmente impactan el funcionamiento o seguridad
- Considera el contexto del proyecto y su lenguaje/framework
- Si ejecutas comandos, confirma que existen (linter, test runner)
- No sugieras cambios cosméticos como prioridad alta`,

  tools: reviewerTools,
  maxIterations: 10,
  temperature: 0.2,
};

export default reviewerAgent;