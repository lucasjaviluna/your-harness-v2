import type { SessionContext, ModeType, ProviderType } from '../types/index.js';

export interface ContextManager {
  createSession(project: string, options?: {
    mode?: ModeType;
    provider?: ProviderType;
    mcpServers?: string[];
  }): SessionContext;
  
  getSession(id: string): SessionContext | undefined;
  updateSession(id: string, updates: Partial<SessionContext>): void;
  endSession(id: string): void;
  listSessions(): SessionContext[];
}

export const createContextManager = (): ContextManager => {
  const sessions = new Map<string, SessionContext>();

  return {
    createSession(project, options = {}) {
      const id = generateSessionId();
      const session: SessionContext = {
        id,
        project,
        mode: options.mode ?? 'custom',
        provider: options.provider ?? 'claude',
        startedAt: new Date(),
        mcpServers: options.mcpServers ?? [],
      };
      sessions.set(id, session);
      return session;
    },

    getSession(id) {
      return sessions.get(id);
    },

    updateSession(id, updates) {
      const session = sessions.get(id);
      if (session) {
        Object.assign(session, updates);
      }
    },

    endSession(id) {
      sessions.delete(id);
    },

    listSessions() {
      return Array.from(sessions.values());
    },
  };
};

const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `yh_${timestamp}_${random}`;
};