# Memory Panel Contract

> **Upstream repo:** CINEOS_Memory
> **Status:** Prototype-backed (mock data adapters, no real memory engine yet)
> **Panel-runtime aware:** Yes — all data contracts are designed for consumption by registered CINEOS panels via typed adapter interfaces.
> **Consuming panels:** Memory Lens Panel, Memory Graph Panel

---

## 1. Overview

The Memory Panel Contract defines the data shapes, adapter interfaces, and commands that CINEOS Memory exposes for memory-centric panels running inside the CINEOS workspace host. Two panels consume this contract: the Memory Lens Panel (search and inspect) and the Memory Graph Panel (graph visualization). Both receive data through typed adapters and never access Memory subsystem internals directly.

---

## 2. Object Types Produced

CINEOS Memory produces two primary object types that flow into the panel ecosystem.

### 2.1 MemoryNode

A discrete unit of knowledge stored in the memory system.

```typescript
interface MemoryNode {
  node_id: string;                  // UUID
  type: MemoryNodeType;
  title: string;
  content: string;                  // Human-readable content (markdown supported)
  summary?: string;                 // Short summary for list/card display
  created_at: string;               // ISO 8601
  updated_at: string;               // ISO 8601
  source: MemorySource;
  confidence: number;               // 0.0 – 1.0
  trust_label: TrustLabel;
  tags: string[];
  evidence: Evidence[];
  metadata: Record<string, unknown>;
}

type MemoryNodeType =
  | "fact"                          // A discrete factual assertion
  | "observation"                   // An observed pattern or behavior
  | "decision"                      // A recorded decision with rationale
  | "context"                       // Background/contextual information
  | "preference"                    // User or system preference
  | "procedure"                     // A step-by-step process
  | "entity";                       // A named entity (person, project, system)

interface MemorySource {
  source_type: "user_authored" | "system_inferred" | "imported" | "worker_produced";
  source_id?: string;               // Reference to originating entity (e.g., worker_event_id)
  source_label: string;             // Human-readable provenance description
}

type TrustLabel = "verified" | "synthetic" | "user-authored";
```

### 2.2 Note

A user-created annotation attached to a memory node or standing alone.

```typescript
interface Note {
  note_id: string;                  // UUID
  author: string;                   // User identifier
  content: string;                  // Markdown text
  created_at: string;               // ISO 8601
  updated_at: string;               // ISO 8601
  attached_to?: string;             // node_id if attached to a MemoryNode
  tags: string[];
  is_pinned: boolean;
}
```

### 2.3 Evidence

Supporting evidence for a memory node's claims.

```typescript
interface Evidence {
  evidence_id: string;              // UUID
  type: EvidenceType;
  description: string;
  source_ref?: string;              // URI or internal reference
  confidence: number;               // 0.0 – 1.0
  timestamp?: string;               // ISO 8601 — when the evidence was captured
}

type EvidenceType =
  | "direct_observation"            // Directly observed in a session
  | "user_statement"                // Explicitly stated by the user
  | "inference"                     // Derived by reasoning
  | "external_source"               // Imported from external data
  | "corroboration";                // Confirmed by multiple sources
```

---

## 3. Memory Lens Data Contract

The Memory Lens Panel provides a search-driven interface into the memory system.

### 3.1 Search Request

```typescript
interface MemorySearchRequest {
  query: string;                    // Natural language or keyword query
  filters?: MemorySearchFilters;
  sort_by?: "relevance" | "created_at" | "updated_at" | "confidence";
  sort_order?: "asc" | "desc";
  limit?: number;                   // Default: 25, max: 100
  offset?: number;                  // Pagination offset
}

interface MemorySearchFilters {
  node_types?: MemoryNodeType[];    // Filter by node type
  trust_labels?: TrustLabel[];      // Filter by trust label
  tags?: string[];                  // Filter by tags (OR logic)
  confidence_min?: number;          // Minimum confidence threshold
  created_after?: string;           // ISO 8601
  created_before?: string;          // ISO 8601
  source_types?: MemorySource["source_type"][];
}
```

### 3.2 Search Response

```typescript
interface MemorySearchResponse {
  query: string;
  results: MemorySearchResult[];
  total: number;
  limit: number;
  offset: number;
  search_time_ms: number;
}

interface MemorySearchResult {
  node: MemoryNode;
  relevance_score: number;          // 0.0 – 1.0
  highlight_fragments: HighlightFragment[];
  related_notes: Note[];            // Notes attached to this node
}

interface HighlightFragment {
  field: "title" | "content" | "summary";
  text: string;                     // Fragment with <mark> tags around matching terms
}
```

### 3.3 Node Detail

For inspecting a single memory node in full detail.

```typescript
interface MemoryNodeDetail {
  node: MemoryNode;
  notes: Note[];
  edges: MemoryEdge[];              // All edges connected to this node
  related_nodes: MemoryNode[];      // Directly connected nodes
  history: MemoryNodeVersion[];     // Edit history
}

interface MemoryNodeVersion {
  version: number;
  updated_at: string;
  changed_fields: string[];
  author: string;
}
```

---

## 4. Memory Graph Data Contract

The Memory Graph Panel renders an interactive graph of memory nodes and their relationships.

### 4.1 MemoryGraph

```typescript
interface MemoryGraph {
  graph_id: string;                 // UUID — identifies this particular graph view
  nodes: MemoryGraphNode[];
  edges: MemoryEdge[];
  layout_hint: GraphLayoutHint;
  focus_node_id?: string;           // The node the graph is centered on
  total_nodes: number;              // Total in the full graph (may exceed loaded count)
  total_edges: number;
}

interface MemoryGraphNode {
  node: MemoryNode;
  position?: GraphPosition;         // Computed by layout engine; optional in contract
  is_expanded: boolean;             // Whether child edges are loaded
  depth: number;                    // Distance from focus node
}

interface GraphPosition {
  x: number;
  y: number;
}

type GraphLayoutHint =
  | "force_directed"
  | "hierarchical"
  | "radial"
  | "timeline";                     // Nodes arranged chronologically on x-axis
```

### 4.2 MemoryEdge

```typescript
interface MemoryEdge {
  edge_id: string;                  // UUID
  source_node_id: string;
  target_node_id: string;
  type: MemoryEdgeType;
  label?: string;                   // Human-readable edge label
  weight: number;                   // 0.0 – 1.0, strength of connection
  created_at: string;               // ISO 8601
  metadata: Record<string, unknown>;
}

type MemoryEdgeType =
  | "reasoning"                     // A logical reasoning link (A implies B, A supports B)
  | "temporal"                      // A happened before/after B
  | "causal"                        // A caused B
  | "similarity"                    // A is similar to B
  | "reference"                     // A references B
  | "contradiction"                 // A contradicts B
  | "elaboration"                   // B elaborates on A
  | "annotation";                   // A note attached to a node
```

### 4.3 Graph Expansion

Panels can expand nodes to load their neighborhood.

```typescript
interface GraphExpansionRequest {
  node_id: string;
  edge_types?: MemoryEdgeType[];    // Filter which edge types to follow
  max_depth?: number;               // Default: 1
  max_nodes?: number;               // Default: 50
}

interface GraphExpansionResponse {
  center_node_id: string;
  new_nodes: MemoryGraphNode[];
  new_edges: MemoryEdge[];
}
```

---

## 5. Commands

Commands are dispatched through the workspace host command bus.

| Command                | Payload                                          | Target Panel        | Description                                      |
|------------------------|--------------------------------------------------|---------------------|--------------------------------------------------|
| `open_in_memory_lens`  | `{ query?: string, node_id?: string }`           | Memory Lens Panel   | Open Memory Lens, optionally pre-filled with a search query or focused on a specific node. |
| `open_in_memory_graph` | `{ focus_node_id: string, edge_types?: MemoryEdgeType[] }` | Memory Graph Panel  | Open Memory Graph centered on the specified node. |

**Command dispatch via adapter:**

```typescript
interface MemoryCommandAdapter {
  openInMemoryLens(options?: { query?: string; node_id?: string }): void;
  openInMemoryGraph(focus_node_id: string, edge_types?: MemoryEdgeType[]): void;
}
```

---

## 6. Typed Adapter Interface

All data access goes through the adapter provided to panels at mount time.

```typescript
interface MemoryPanelAdapter {
  // Memory Lens
  searchMemory(request: MemorySearchRequest): Promise<MemorySearchResponse>;
  getMemoryNodeDetail(node_id: string): Promise<MemoryNodeDetail>;

  // Memory Graph
  getMemoryGraph(focus_node_id: string, options?: GraphExpansionRequest): Promise<MemoryGraph>;
  expandGraphNode(request: GraphExpansionRequest): Promise<GraphExpansionResponse>;

  // Notes
  getNotesForNode(node_id: string): Promise<Note[]>;
  createNote(note: Omit<Note, "note_id" | "created_at" | "updated_at">): Promise<Note>;
  updateNote(note_id: string, patch: Partial<Note>): Promise<Note>;
  deleteNote(note_id: string): Promise<void>;

  // Subscriptions
  subscribeToNodeUpdates(node_id: string, callback: (node: MemoryNode) => void): Unsubscribe;
  subscribeToGraphUpdates(graph_id: string, callback: (graph: MemoryGraph) => void): Unsubscribe;

  // Commands
  commands: MemoryCommandAdapter;
}

type Unsubscribe = () => void;
```

---

## 7. Prototype Implementation Notes

- `searchMemory` returns a static set of 15 mock memory nodes with pre-computed relevance scores and highlight fragments.
- `getMemoryGraph` returns a mock graph with 12 nodes and 18 edges spanning all edge types.
- `expandGraphNode` adds 3-5 synthetic nodes per expansion call.
- Notes are stored in-memory and do not survive page reload.
- Subscriptions fire once on subscribe with current mock state and do not emit further updates.
- All mock data is deterministic and keyed on IDs for test stability.
- Trust labels and confidence scores are pre-assigned to mock nodes to exercise all display paths.
