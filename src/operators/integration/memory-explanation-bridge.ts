/**
 * Memory Explanation Bridge - Live Integration
 * Status: IMPLEMENTED
 *
 * Provides the Memory-side contract for the memory explanation flow.
 * Maps summarize_memory_chain operator to CINEOS_Memory domain.
 */

/** Context passed into the memory explanation operator chain. */
export interface MemoryExplanationContext {
  memory_node_ids: string[];
  chain_depth: number;
  include_confidence: boolean;
}

/** Result returned by the memory explanation chain. */
export interface MemoryExplanationResult {
  chain_summary: string;
  key_decisions: string[];
  confidence_score: number;
}

/**
 * Build the default memory explanation context.
 * When no node IDs are provided, defaults to an empty set (latest chain).
 */
export function createMemoryExplanationContext(
  nodeIds?: string[],
): MemoryExplanationContext {
  return {
    memory_node_ids: nodeIds ?? [],
    chain_depth: 5,
    include_confidence: true,
  };
}

/**
 * Validate that an operator output conforms to {@link MemoryExplanationResult}.
 */
export function validateMemoryExplanationResult(
  result: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof result.chain_summary !== 'string') {
    errors.push('chain_summary must be a string');
  }
  if (!Array.isArray(result.key_decisions)) {
    errors.push('key_decisions must be an array');
  }
  if (typeof result.confidence_score !== 'number') {
    errors.push('confidence_score must be a number');
  }

  return { valid: errors.length === 0, errors };
}

/** Operator IDs covered by this bridge. */
export const MEMORY_EXPLANATION_OPERATORS = [
  'summarize_memory_chain',
  'load_memory_node',
] as const;

/** Bridge integration status. */
export const BRIDGE_STATUS = 'IMPLEMENTED' as const;
