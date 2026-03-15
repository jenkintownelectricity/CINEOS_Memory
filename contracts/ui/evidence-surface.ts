/**
 * Evidence Surface Contract
 *
 * Provides structured evidence and explanation data for decisions
 * made by the CINEOS intelligence layer.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvidenceSource {
  /** Identifier of the source material. */
  sourceId: string;

  /** Type of source (e.g. "memory", "document", "metric"). */
  sourceType: string;

  /** Human-readable label. */
  label: string;

  /** Optional excerpt or snippet from the source. */
  excerpt?: string;
}

export interface WorkerTraceRef {
  /** Trace identifier linking to the worker-trace-payload contract. */
  traceId: string;

  /** Worker class that produced this trace. */
  workerClass: string;

  /** Summary of the worker's action. */
  summary: string;
}

export interface RelatedMemory {
  /** Memory identifier linking to the memory-lens contract. */
  memoryId: string;

  /** Short summary of the related memory. */
  summary: string;

  /** Relevance score (0-1). */
  relevance: number;
}

export interface EvidenceDetail {
  /** Human-readable reasoning narrative explaining the decision. */
  reasoning: string;

  /** Sources that informed the decision. */
  sources: EvidenceSource[];

  /** Worker trace references showing the execution path. */
  workerTrace: WorkerTraceRef[];

  /** Overall confidence in the decision (0-1). */
  confidence: number;

  /** Memories related to this decision. */
  relatedMemories: RelatedMemory[];
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface EvidenceSurface {
  /**
   * Retrieve the full evidence detail for a given decision.
   *
   * @param decisionId - The identifier of the decision to explain.
   * @returns Structured evidence including reasoning, sources, traces,
   *          confidence, and related memories.
   */
  getEvidenceForDecision(decisionId: string): Promise<EvidenceDetail>;
}
