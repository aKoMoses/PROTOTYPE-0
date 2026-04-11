// Central typed event bus
const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(handler);
}

export function off(event, handler) {
  if (listeners.has(event)) {
    listeners.get(event).delete(handler);
  }
}

export function emit(event, data) {
  if (listeners.has(event)) {
    for (const handler of listeners.get(event)) {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for event ${event}:`, err);
      }
    }
  }
}
