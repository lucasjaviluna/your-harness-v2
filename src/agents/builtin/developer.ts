import type { AgentDefinition } from '../types.js';
import type { ToolDefinition } from '../../core/ai/types.js';

const developerTools: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Lee el contenido de un archivo',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Ruta del archivo a leer',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Escribe contenido en un archivo',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Ruta del archivo a escribir',
        },
        content: {
          type: 'string',
          description: 'Contenido a escribir',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'Lista archivos en un directorio',
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
    description: 'Ejecuta un comando en la terminal',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Comando a ejecutar',
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
    name: 'search_code',
    description: 'Busca patrones en el código del proyecto',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto o regex a buscar',
        },
        path: {
          type: 'string',
          description: 'Directorio donde buscar',
        },
        fileTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Extensiones de archivo a incluir',
        },
      },
      required: ['query'],
    },
  },
];

export const developerAgent: AgentDefinition = {
  name: 'developer',
  description: 'Agente desarrollador full-stack. Escribe, modifica y mejora código.',
  version: '0.1.0',
  
  systemPrompt: `Eres un desarrollador de software experto. Tu objetivo es ayudar a construir, modificar y mejorar código.

CAPACIDADES:
- Leer y escribir archivos del proyecto
- Ejecutar comandos en la terminal
- Buscar código y patrones en el codebase
- Analizar y refactorizar código existente
- Implementar nuevas funcionalidades
- Solucionar bugs y errores

PROCESO DE TRABAJO:
1. ANALIZA: Entiende el problema y el contexto antes de actuar
2. EXPLORA: Revisa archivos relevantes del proyecto
3. PLANIFICA: Describe tu enfoque antes de escribir código
4. IMPLEMENTA: Escribe código limpio, documentado y testeable
5. VERIFICA: Confirma que los cambios funcionan correctamente

REGLAS:
- Siempre lee los archivos relevantes antes de modificarlos
- Sigue las convenciones y patrones existentes en el proyecto
- Escribe código seguro, sin vulnerabilidades
- Incluye manejo de errores apropiado
- Documenta decisiones importantes
- Si no entiendes algo, pregunta antes de asumir
- Prioriza soluciones simples sobre complejas
- No inventes APIs o librerías que no existan`,

  tools: developerTools,
  maxIterations: 15,
  temperature: 0.3,
};

export default developerAgent;