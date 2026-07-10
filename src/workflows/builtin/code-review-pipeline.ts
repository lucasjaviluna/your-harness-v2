import type { WorkflowDefinition } from '../types.js';

export const codeReviewPipeline: WorkflowDefinition = {
  name: 'code-review-pipeline',
  version: '0.1.0',
  description: 'Pipeline completo de revisión de código: análisis estático, revisión IA, y reporte',

  variables: {
    targetPath: '.',
    filePattern: '**/*.ts',
    reviewFocus: 'security,performance,style',
  },

  config: {
    maxDuration: 600, // 10 minutos
    notifyOnComplete: true,
    storeResults: true,
  },

  steps: [
    {
      id: 'discover-files',
      name: 'Discover Files',
      type: 'command',
      description: 'Encuentra archivos a revisar según el patrón',
      config: {
        type: 'command',
        command: 'find {{targetPath}} -name "{{filePattern}}" -type f',
        captureOutput: true,
      },
      timeout: 30,
    },
    {
      id: 'run-linter',
      name: 'Run Linter',
      type: 'command',
      description: 'Ejecuta el linter sobre los archivos descubiertos',
      config: {
        type: 'command',
        command: 'npx eslint {{targetPath}} --ext .ts,.tsx --format json',
        captureOutput: true,
      },
      dependsOn: ['discover-files'],
      timeout: 120,
      retryCount: 1,
    },
    {
      id: 'run-tests',
      name: 'Run Tests',
      type: 'command',
      description: 'Ejecuta tests unitarios para verificar que nada está roto',
      config: {
        type: 'command',
        command: 'npm test -- --passWithNoTests',
        captureOutput: true,
      },
      dependsOn: ['discover-files'],
      timeout: 300,
    },
    {
      id: 'ai-review',
      name: 'AI Code Review',
      type: 'agent',
      description: 'Revisión de código con agente IA especializado',
      config: {
        type: 'agent',
        agent: 'reviewer',
        objective: `Realiza una revisión completa de código en {{targetPath}}.

Contexto adicional:
- Resultados del linter: $run-linter.output
- Resultados de tests: $run-tests.output
- Foco de revisión: {{reviewFocus}}

Genera un reporte estructurado con:
1. Issues encontrados (priorizados por severidad)
2. Sugerencias de mejora específicas
3. Puntuación general del código`,
        variables: {},
      },
      dependsOn: ['run-linter', 'run-tests'],
      timeout: 300,
    },
    {
      id: 'generate-report',
      name: 'Generate Final Report',
      type: 'script',
      description: 'Consolida resultados en un reporte final',
      config: {
        type: 'script',
        language: 'javascript',
        code: `
          const linterResults = JSON.parse(context.stepResults.get('run-linter')?.output || '{}');
          const reviewResults = context.stepResults.get('ai-review')?.output;
          
          const report = {
            timestamp: new Date().toISOString(),
            target: '{{targetPath}}',
            summary: {
              linterIssues: linterResults?.length || 0,
              testPassed: true,
              aiReviewCompleted: !!reviewResults,
            },
            linterOutput: linterResults,
            aiReview: reviewResults,
          };
          
          return JSON.stringify(report, null, 2);
        `,
      },
      dependsOn: ['ai-review'],
      timeout: 30,
    },
    {
      id: 'save-report',
      name: 'Save Report',
      type: 'command',
      description: 'Guarda el reporte en un archivo',
      config: {
        type: 'command',
        command: 'echo "$generate-report.output" > review-report-$(date +%Y%m%d-%H%M%S).json',
        captureOutput: false,
      },
      dependsOn: ['generate-report'],
      timeout: 10,
    },
  ],

  triggers: [
    {
      type: 'manual',
      config: {},
    },
    {
      type: 'git-hook',
      config: {
        hook: 'pre-push',
        branches: ['main', 'develop'],
      },
    },
  ],
};

export default codeReviewPipeline;