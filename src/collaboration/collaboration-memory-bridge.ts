/**
 * Collaboration Memory Bridge
 *
 * Links collaboration context to the memory chain system.
 * Records collaboration sessions and mutation contexts for memory retrieval.
 * Emits collaboration_event when memory context is recorded.
 *
 * Classification: foundational memory bridge — localStorage-backed.
 */

export interface CollaborationMemoryContext {
  context_id: string;
  session_id: string;
  mutation_id: string;
  user_id: string;
  recorded_at: string;
  memory_chain_ref: string | null;
  payload: Record<string, unknown>;
}

export interface MemoryBridgeEvent {
  event_type: 'context_recorded' | 'context_retrieved';
  detail: Record<string, unknown>;
  timestamp: string;
}

const STORAGE_KEY = 'cineos:memory:collaboration-contexts';

/**
 * Generate a simple unique ID.
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class CollaborationMemoryBridge {
  private contexts: Map<string, CollaborationMemoryContext> = new Map();
  private eventLog: MemoryBridgeEvent[] = [];
  private onEvent?: (event: MemoryBridgeEvent) => void;
  private loaded = false;

  constructor(onEvent?: (event: MemoryBridgeEvent) => void) {
    this.onEvent = onEvent;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (this.loaded) return;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const arr: CollaborationMemoryContext[] = JSON.parse(raw);
          for (const c of arr) {
            this.contexts.set(c.context_id, c);
          }
        }
      }
    } catch {
      // Storage unavailable
    }
    this.loaded = true;
  }

  private persistToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const arr = Array.from(this.contexts.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      }
    } catch (e) {
      throw new Error(`Memory bridge persistence failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private logEvent(event: MemoryBridgeEvent): void {
    this.eventLog.push(event);
    if (this.onEvent) {
      this.onEvent(event);
    }
  }

  /**
   * Record collaboration context linked to a specific mutation.
   * Links the collaboration session + mutation to the memory chain.
   */
  recordCollaborationContext(
    sessionId: string,
    mutationId: string,
    userId: string,
    payload?: Record<string, unknown>,
    memoryChainRef?: string
  ): CollaborationMemoryContext {
    if (!sessionId || !mutationId || !userId) {
      throw new Error('sessionId, mutationId, and userId are required');
    }

    const contextId = generateId();
    const now = new Date().toISOString();

    const context: CollaborationMemoryContext = {
      context_id: contextId,
      session_id: sessionId,
      mutation_id: mutationId,
      user_id: userId,
      recorded_at: now,
      memory_chain_ref: memoryChainRef ?? null,
      payload: payload ?? {},
    };

    this.contexts.set(contextId, context);
    this.persistToStorage();

    this.logEvent({
      event_type: 'context_recorded',
      detail: {
        context_id: contextId,
        session_id: sessionId,
        mutation_id: mutationId,
        user_id: userId,
      },
      timestamp: now,
    });

    return { ...context, payload: { ...context.payload } };
  }

  /**
   * Retrieve memory contexts for a collaboration session.
   * Returns all contexts linked to the session, ordered by recording time.
   */
  getMemoryForCollaboration(sessionId: string): CollaborationMemoryContext[] {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    const results = Array.from(this.contexts.values())
      .filter(c => c.session_id === sessionId)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      .map(c => ({ ...c, payload: { ...c.payload } }));

    this.logEvent({
      event_type: 'context_retrieved',
      detail: { session_id: sessionId, count: results.length },
      timestamp: new Date().toISOString(),
    });

    return results;
  }

  /**
   * Get contexts for a specific mutation.
   */
  getContextsForMutation(mutationId: string): CollaborationMemoryContext[] {
    return Array.from(this.contexts.values())
      .filter(c => c.mutation_id === mutationId)
      .map(c => ({ ...c, payload: { ...c.payload } }));
  }

  /**
   * Get event log (for testing).
   */
  getEventLog(): MemoryBridgeEvent[] {
    return [...this.eventLog];
  }
}
