type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, payload: T): Promise<void>;
  once<T>(event: string, handler: EventHandler<T>): void;
  listenerCount(event: string): number;
}

export const createEventBus = (): EventBus => {
  const handlers = new Map<string, Set<EventHandler>>();

  return {
    on(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    },

    off(event, handler) {
      handlers.get(event)?.delete(handler);
    },

    async emit(event, payload) {
      const eventHandlers = handlers.get(event);
      if (!eventHandlers) return;
      
      const promises = Array.from(eventHandlers).map(handler => 
        Promise.resolve(handler(payload))
      );
      await Promise.all(promises);
    },

    once(event, handler) {
      const wrapper: EventHandler = (payload) => {
        this.off(event, wrapper);
        return handler(payload);
      };
      this.on(event, wrapper);
    },

    listenerCount(event) {
      return handlers.get(event)?.size ?? 0;
    },
  };
};