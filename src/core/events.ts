type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, payload: T): Promise<void>;
  once<T>(event: string, handler: EventHandler<T>): void;
  listenerCount(event: string): number;
}

export const createEventBus = (): EventBus => {
  const handlers = new Map<string, Set<EventHandler<unknown>>>();

  return {
    on(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler as EventHandler<unknown>);
    },

    off(event, handler) {
      handlers.get(event)?.delete(handler as EventHandler<unknown>);
    },

    async emit<T>(event: string, payload: T) {
      const eventHandlers = handlers.get(event) as
        Set<EventHandler<T>> | undefined;
      if (!eventHandlers) return;

      const promises = Array.from(eventHandlers).map((handler) =>
        Promise.resolve(handler(payload)),
      );
      await Promise.all(promises);
    },

    once<T>(event: string, handler: EventHandler<T>) {
      const wrapper: EventHandler<T> = (payload) => {
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
