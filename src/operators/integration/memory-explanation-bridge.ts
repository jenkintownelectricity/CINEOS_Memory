/**
 * Memory Explanation Bridge - Live Integration
 * Status: HARDENED (L04R Phase 2)
 *
 * Provides the Memory-side contract for the memory explanation flow.
 * Maps summarize_memory_chain operator to CINEOS_Memory domain.
 *
 * Hardened loop support: validates operator outputs at the bridge boundary,
 * provides degraded-state detection, and exposes loop health introspection.
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

/** Health status of a hardened loop execution. */
export interface LoopHealthStatus {
  loop_id: string;
  healthy: boolean;
  last_execution_ms: number;
  last_status: 'completed' | 'failed' | 'degraded' | 'not_run';
  validation_passed: boolean;
  permissions_granted: boolean;
  trace_recorded: boolean;
  audit_logged: boolean;
  failure_reported: boolean;
  degraded_state_emitted: boolean;
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

/**
 * Validate the full hardened loop execution result from IntegratedGraphRuntime.
 * Checks that all hardening system nodes executed successfully.
 */
export function validateHardenedLoopResult(
  executionState: Record<string, unknown>,
): LoopHealthStatus {
  const nodeStates = (executionState.node_states as Record<string, Record<string, unknown>>) ?? {};

  const checkNodeCompleted = (prefix: string): boolean => {
    for (const [nodeId, state] of Object.entries(nodeStates)) {
      if (nodeId.startsWith(prefix) && (state as Record<string, unknown>).status === 'completed') {
        return true;
      }
    }
    return false;
  };

  const status = executionState.status as string;

  return {
    loop_id: 'loop-2-commit-to-memory-explanation',
    healthy: status === 'completed',
    last_execution_ms: 0,
    last_status: (status as LoopHealthStatus['last_status']) ?? 'not_run',
    validation_passed: checkNodeCompleted('cme-validate'),
    permissions_granted: checkNodeCompleted('cme-enforce'),
    trace_recorded: checkNodeCompleted('cme-record'),
    audit_logged: checkNodeCompleted('cme-audit'),
    failure_reported: checkNodeCompleted('cme-report'),
    degraded_state_emitted: checkNodeCompleted('cme-emit'),
  };
}

/**
 * Build inputs for the hardened commit-to-memory explanation preset graph.
 * Maps Memory-domain context to the operator graph's expected input shape.
 */
export function buildHardenedLoopInputs(
  commitId: string,
  context?: Partial<MemoryExplanationContext>,
): Record<string, unknown> {
  return {
    commit_id: commitId,
    memory_node_ids: context?.memory_node_ids ?? [],
    chain_depth: context?.chain_depth ?? 5,
    include_confidence: context?.include_confidence ?? true,
  };
}

/**
 * Extract the panel effects from a completed hardened loop execution.
 * Returns the ordered list of panel actions that occurred (open_in_memory_lens,
 * open_in_commit_graph) for downstream consumption.
 */
export function extractPanelEffects(
  nodeStates: Record<string, Record<string, unknown>>,
): Array<{ action: string; node_id: string; outputs: Record<string, unknown> }> {
  const effects: Array<{ action: string; node_id: string; outputs: Record<string, unknown> }> = [];
  const panelNodeIds = ['cme-open-memory-lens', 'cme-return-commit-graph'];

  for (const nodeId of panelNodeIds) {
    const state = nodeStates[nodeId];
    if (state && (state as Record<string, unknown>).status === 'completed') {
      effects.push({
        action: nodeId.replace('cme-', '').replace(/-/g, '_'),
        node_id: nodeId,
        outputs: ((state as Record<string, unknown>).outputs_snapshot as Record<string, unknown>) ?? {},
      });
    }
  }

  return effects;
}

/** Operator IDs covered by this bridge. */
export const MEMORY_EXPLANATION_OPERATORS = [
  'summarize_memory_chain',
  'load_memory_node',
] as const;

/** System operator IDs added by hardening. */
export const HARDENED_SYSTEM_OPERATORS = [
  'health_check',
  'validate_inputs',
  'enforce_permissions',
  'build_memory_summary_card',
  'record_execution_trace',
  'log_audit_event',
  'report_failure',
  'emit_degraded_state',
] as const;

/** Bridge integration status. */
export const BRIDGE_STATUS = 'HARDENED' as const;

/** Preset graph ID for the hardened loop. */
export const HARDENED_PRESET_ID = 'preset-commit-to-memory-explanation' as const;

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
 * Updated for hardened v2 preset with all system nodes.
 */
export function getExpectedLoopProofChain(): Array<{ operator_id: string; operator_class: string }> {
  return [
    { operator_id: 'health_check', operator_class: 'system' },
    { operator_id: 'validate_inputs', operator_class: 'system' },
    { operator_id: 'enforce_permissions', operator_class: 'system' },
    { operator_id: 'load_commit', operator_class: 'input' },
    { operator_id: 'summarize_memory_chain', operator_class: 'analysis' },
    { operator_id: 'inspect_worker_trace', operator_class: 'analysis' },
    { operator_id: 'build_memory_summary_card', operator_class: 'transformation' },
    { operator_id: 'open_in_memory_lens', operator_class: 'graph_bridge' },
    { operator_id: 'open_in_commit_graph', operator_class: 'graph_bridge' },
    { operator_id: 'record_execution_trace', operator_class: 'system' },
    { operator_id: 'log_audit_event', operator_class: 'system' },
    { operator_id: 'report_failure', operator_class: 'system' },
    { operator_id: 'emit_degraded_state', operator_class: 'system' },
  ];
}
