/**
 * Memory Lens Contract
 *
 * Search, inspect, and pin memories surfaced by the CINEOS memory
 * subsystem. Includes evidence chain traversal and contextual lookup.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemoryQuery {
  /** Free-text search term. */
  text?: string;

  /** Filter by source system. */
  source?: string;

  /** Filter by author / worker identity. */
  author?: string;

  /** Filter by role (e.g. "user", "worker", "system"). */
  role?: string;

  /** Minimum confidence threshold (0-1). */
  minConfidence?: number;

  /** Maximum number of results. */
  limit?: number;

  /** Pagination offset. */
  offset?: number;
}

export interface MemoryResult {
  /** Unique memory identifier. */
  id: string;

  /** Short human-readable summary. */
  summary: string;

  /** Confidence score (0-1). */
  confidence: number;

  /** Originating source system. */
  source: string;

  /** Author or worker that produced this memory. */
  author: string;

  /** Role of the author. */
  role: string;

  /** ISO-8601 timestamp of when the memory was recorded. */
  timestamp: string;

  /** References to supporting evidence nodes. */
  evidenceRefs: string[];
}

export interface MemoryDetail extends MemoryResult {
  /** Full content of the memory. */
  content: string;

  /** Tags / labels attached to this memory. */
  tags: string[];

  /** Whether this memory is currently pinned. */
  pinned: boolean;
}

export interface EvidenceNode {
  /** Unique evidence node identifier. */
  id: string;

  /** Type of evidence (e.g. "source", "inference", "observation"). */
  type: string;

  /** Human-readable description. */
  description: string;

  /** IDs of parent evidence nodes (forming the chain). */
  parentIds: string[];

  /** Arbitrary payload attached to this node. */
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface MemoryLens {
  /**
   * Search memories matching the given query parameters.
   */
  searchMemory(query: MemoryQuery): Promise<MemoryResult[]>;

  /**
   * Retrieve full detail for a single memory.
   */
  getMemoryDetail(memoryId: string): Promise<MemoryDetail>;

  /**
   * Walk the evidence chain for a memory, returning all nodes.
   */
  getEvidenceChain(memoryId: string): Promise<EvidenceNode[]>;

  /**
   * Pin a memory so it remains prominent in future queries.
   */
  pinMemory(memoryId: string): Promise<void>;

  /**
   * Retrieve memories contextually relevant to a given reference
   * (e.g. a timeline ID, scene ID, or commit ID).
   */
  getContextualMemories(contextRef: string): Promise<MemoryResult[]>;
}
