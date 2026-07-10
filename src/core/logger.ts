import pino from 'pino';
import type { LogLevel } from '../types/index.js';

export const createLogger = (level: LogLevel = 'info') => {
  return pino({
    level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  });
};

export type Logger = ReturnType<typeof createLogger>;