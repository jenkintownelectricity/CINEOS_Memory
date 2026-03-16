/**
 * Intelligence-Memory Bridge
 *
 * Connects intelligence analyses to memory chains.
 * Emits intelligence_event on linkage.
 *
 * Classification: bridge layer, links intelligence to memory context.
 */

// --- Types ---

export interface IntelligenceMemoryLink {
  link_id: string;
  analysis_id: string;
  memory_chain_id: string;
  linked_at: string;
}

export interface IntelligenceEvent {
  event_id: string;
  event_class: 'intelligence_event';
  source_subsystem: string;
  source_object_id: string;
  related_cdg_object_ids: string[];
  payload: Record<string, unknown>;
  status: 'emitted';
  emitted_at: string;
  actor_ref: string;
  correlation_id: string;
  causality_ref: string | null;
  replayable_flag: boolean;
}

export interface EventSpineEmitter {
  emit(event: IntelligenceEvent): void;
}

// --- ID generation ---

let bridgeIdCounter = 0;
function generateBridgeId(): string {
  bridgeIdCounter++;
  return `imb-${Date.now().toString(36)}-${bridgeIdCounter.toString(36)}`;
}

// --- Store ---

const linkStore = new Map<string, IntelligenceMemoryLink>();
const analysisByMemory = new Map<string, string[]>(); // memoryChainId -> analysisIds
const memoryByAnalysis = new Map<string, string[]>(); // analysisId -> memoryChainIds

// --- Default event spine ---

const defaultEventLog: IntelligenceEvent[] = [];
export const InMemoryBridgeEventSpine: EventSpineEmitter & { events: IntelligenceEvent[] } = {
  events: defaultEventLog,
  emit(event: IntelligenceEvent): void {
    this.events.push(event);
  },
};

// --- Internal ---

function emitBridgeEvent(
  spine: EventSpineEmitter,
  linkId: string,
  cdgIds: string[],
  payload: Record<string, unknown>,
): void {
  const event: IntelligenceEvent = {
    event_id: generateBridgeId(),
    event_class: 'intelligence_event',
    source_subsystem: 'intelligence_memory_bridge',
    source_object_id: linkId,
    related_cdg_object_ids: cdgIds,
    payload,
    status: 'emitted',
    emitted_at: new Date().toISOString(),
    actor_ref: 'intelligence-memory-bridge-v1',
    correlation_id: generateBridgeId(),
    causality_ref: null,
    replayable_flag: true,
  };
  spine.emit(event);
}

// --- Public API ---

/**
 * Link an intelligence analysis to a memory chain.
 * Emits intelligence_event on linkage.
 */
export function linkAnalysisToMemory(
  analysisId: string,
  memoryChainId: string,
  spine: EventSpineEmitter = InMemoryBridgeEventSpine,
): IntelligenceMemoryLink {
  const link: IntelligenceMemoryLink = {
    link_id: generateBridgeId(),
    analysis_id: analysisId,
    memory_chain_id: memoryChainId,
    linked_at: new Date().toISOString(),
  };

  linkStore.set(link.link_id, link);

  // Index both directions
  const existingByMemory = analysisByMemory.get(memoryChainId) || [];
  existingByMemory.push(analysisId);
  analysisByMemory.set(memoryChainId, existingByMemory);

  const existingByAnalysis = memoryByAnalysis.get(analysisId) || [];
  existingByAnalysis.push(memoryChainId);
  memoryByAnalysis.set(analysisId, existingByAnalysis);

  emitBridgeEvent(spine, link.link_id, [analysisId, memoryChainId], {
    action: 'analysis_linked_to_memory',
    analysis_id: analysisId,
    memory_chain_id: memoryChainId,
  });

  return link;
}

/**
 * Retrieve intelligence analysis IDs linked to a memory chain.
 */
export function getIntelligenceForMemory(memoryChainId: string): string[] {
  return analysisByMemory.get(memoryChainId) || [];
}

/**
 * Retrieve memory chain IDs linked to an analysis.
 */
export function getMemoryForAnalysis(analysisId: string): string[] {
  return memoryByAnalysis.get(analysisId) || [];
}

/**
 * Get a link record by ID.
 */
export function getLink(linkId: string): IntelligenceMemoryLink | undefined {
  return linkStore.get(linkId);
}

/**
 * Clear all links (for testing).
 */
export function clearLinks(): void {
  linkStore.clear();
  analysisByMemory.clear();
  memoryByAnalysis.clear();
}
