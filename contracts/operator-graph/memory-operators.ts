/**
 * Memory Operator Contracts
 * CINEOS Memory — Lane 3
 * Status: SCAFFOLD
 *
 * Operators for memory chain analysis, reasoning, and explanation
 * within the operator graph engine.
 */

export interface MemoryNode {
  node_id: string;
  type: 'decision' | 'observation' | 'inference' | 'feedback' | 'context';
  title: string;
  content: string;
  source: string;
  confidence: number; // 0-1
  created_at: string;
  linked_objects: Array<{ object_type: string; object_id: string }>;
  parent_nodes: string[];
  child_nodes: string[];
  trust_tier: 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
}

export interface MemoryChain {
  chain_id: string;
  root_node: string;
  nodes: MemoryNode[];
  depth: number;
  total_nodes: number;
  summary: string;
}

export interface MemorySummaryCard {
  card_id: string;
  chain_id: string;
  title: string;
  summary: string;
  key_decisions: Array<{ node_id: string; title: string; confidence: number }>;
  total_nodes: number;
  depth: number;
  confidence_range: { min: number; max: number };
  trust_distribution: Record<string, number>;
  linked_objects_count: number;
  created_at: string;
}

export interface CommitNodePreview {
  preview_id: string;
  commit_id: string;
  memory_nodes: string[];
  summary: string;
  reasoning_path: string[];
  confidence: number;
  trust_tier: string;
}

// Executor interfaces
export interface LoadMemoryNodeExecutor {
  execute(input: { node_id: string }): Promise<{ memory_node: MemoryNode }>;
}

export interface SummarizeMemoryChainExecutor {
  execute(input: { root_node_id: string; depth?: number }): Promise<{ chain: MemoryChain; summary: string }>;
}

export interface BuildMemorySummaryCardExecutor {
  execute(input: { chain: MemoryChain }): Promise<{ card: MemorySummaryCard }>;
}

export interface BuildCommitNodePreviewExecutor {
  execute(input: { commit_id: string; memory_nodes: MemoryNode[] }): Promise<{ preview: CommitNodePreview }>;
}

// Demo film proof data
export const DEMO_MEMORY_NODES: MemoryNode[] = [
  {
    node_id: 'mem-001',
    type: 'decision',
    title: 'Opening sequence pacing decision',
    content: 'Director chose slower pacing for opening city dawn sequence to establish mood',
    source: 'editorial-session-001',
    confidence: 0.92,
    created_at: '2026-03-10T14:30:00Z',
    linked_objects: [{ object_type: 'scene', object_id: 'demo-scene-001' }],
    parent_nodes: [],
    child_nodes: ['mem-002', 'mem-003'],
    trust_tier: 'T1',
  },
  {
    node_id: 'mem-002',
    type: 'observation',
    title: 'Archive scene color grading note',
    content: 'Color grading shifted warmer for archive discovery scene to contrast with cool opening',
    source: 'color-review-001',
    confidence: 0.88,
    created_at: '2026-03-11T09:15:00Z',
    linked_objects: [{ object_type: 'scene', object_id: 'demo-scene-002' }],
    parent_nodes: ['mem-001'],
    child_nodes: ['mem-004'],
    trust_tier: 'T1',
  },
  {
    node_id: 'mem-003',
    type: 'inference',
    title: 'Branch conflict predicted',
    content: 'Director cut and producer cut diverge on scene 3 pacing — merge conflict likely',
    source: 'analysis-engine',
    confidence: 0.75,
    created_at: '2026-03-12T16:45:00Z',
    linked_objects: [{ object_type: 'scene', object_id: 'demo-scene-003' }, { object_type: 'branch', object_id: 'demo-directors-cut' }],
    parent_nodes: ['mem-001'],
    child_nodes: ['mem-005'],
    trust_tier: 'T2',
  },
  {
    node_id: 'mem-004',
    type: 'feedback',
    title: 'Producer approved archive pacing',
    content: 'Producer reviewed archive scene and approved current pacing and color approach',
    source: 'review-session-002',
    confidence: 0.95,
    created_at: '2026-03-13T11:00:00Z',
    linked_objects: [{ object_type: 'review_item', object_id: 'review-001' }],
    parent_nodes: ['mem-002'],
    child_nodes: [],
    trust_tier: 'T3',
  },
  {
    node_id: 'mem-005',
    type: 'context',
    title: 'Resolution scene merge strategy',
    content: 'Team agreed to use director pacing with producer color notes for resolution scene',
    source: 'team-session-003',
    confidence: 0.85,
    created_at: '2026-03-14T10:30:00Z',
    linked_objects: [{ object_type: 'scene', object_id: 'demo-scene-004' }],
    parent_nodes: ['mem-003'],
    child_nodes: [],
    trust_tier: 'T2',
  },
];
