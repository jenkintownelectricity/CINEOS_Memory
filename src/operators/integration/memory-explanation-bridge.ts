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
export const BRIDGE_STATUS = 'HARDENED' as const;

// ---------------------------------------------------------------------------
// Hardened Loop Support (L04R Phase 2)
// ---------------------------------------------------------------------------

/** Preset ID for the commit-to-memory explanation loop. */
export const MEMORY_EXPLANATION_PRESET_ID = 'commit-to-memory-explanation';

/** Loop proof result from executing the hardened preset. */
export interface MemoryLoopProofResult {
  loop_id: 'loop-2-commit-to-memory';
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  nodes_executed: number;
  nodes_succeeded: number;
  memory_lens_opened: boolean;
  commit_graph_returned: boolean;
  trace_recorded: boolean;
  data_source: 'seeded_demo' | 'deterministic' | 'integrated';
}

/**
 * Build the expected proof chain for Loop 2.
 */
export function getExpectedLoopProofChain(): Array<{ operator_id: string; operator_class: string }> {
  return [
    { operator_id: 'load_commit', operator_class: 'input' },
    { operator_id: 'summarize_memory_chain', operator_class: 'analysis' },
    { operator_id: 'inspect_worker_trace', operator_class: 'analysis' },
    { operator_id: 'build_memory_summary_card', operator_class: 'transformation' },
    { operator_id: 'open_in_memory_lens', operator_class: 'graph_bridge' },
    { operator_id: 'open_in_commit_graph', operator_class: 'graph_bridge' },
    { operator_id: 'record_execution_trace', operator_class: 'system' },
  ];
}
