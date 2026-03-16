/**
 * FederatedMemoryQueryService — Wave 8 Network Layer
 *
 * Enables cross-project memory querying through federation.
 * All results are non-authoritative projections per KERN-CINEOS-NETWORK-FEDERATION.
 * No cross-project canonical writes. Fail-closed on validation failure.
 */

// ---- Types ----

export type MemoryKind = 'decision' | 'narrative' | 'intent' | 'ai_trace';

export interface MemoryQueryRequest {
  query_id: string;
  requester_identity: string;
  capability_ref: string;
  studio_scope: string;
  entity_types: string[];
  memory_kinds: MemoryKind[];
}

export interface MemoryQueryResult {
  query_id: string;
  authoritative: false;
  source_projects: Array<{
    project_id: string;
    entity_count: number;
    canonical_source: 'project_local_cdg';
  }>;
  results: MemoryResultEntry[];
  projection_timestamp: string;
  staleness_warning: boolean;
}

export interface MemoryResultEntry {
  source_project_id: string;
  entity_id: string;
  entity_type: string;
  memory_kind: MemoryKind;
  data: Record<string, unknown>;
  provenance_ref: string | null;
}

export interface SharedDecisionMemory {
  studio_id: string;
  authoritative: false;
  decisions_count: number;
  projects_contributing: number;
  generated_at: string;
}

export interface NarrativeMemoryProjection {
  studio_id: string;
  authoritative: false;
  narratives_count: number;
  source_projects: string[];
  generated_at: string;
}

// ---- Errors ----

export class MemoryQueryValidationError extends Error {
  constructor(message: string) {
    super(`[FC-NF] Memory query validation failed: ${message}`);
    this.name = 'MemoryQueryValidationError';
  }
}

// ---- Service ----

export class FederatedMemoryQueryService {
  private readonly studioId: string;
  private readonly projectId: string;
  private readonly registeredProjects: Map<string, { entity_count: number; decision_count: number; narrative_count: number }> = new Map();

  constructor(studioId: string, projectId: string) {
    if (!studioId || !projectId) {
      throw new MemoryQueryValidationError('studioId and projectId are required');
    }
    this.studioId = studioId;
    this.projectId = projectId;
  }

  /**
   * Register a project as available for federated memory queries.
   */
  registerProject(
    projectId: string,
    entityCount: number,
    decisionCount: number = 0,
    narrativeCount: number = 0
  ): void {
    this.registeredProjects.set(projectId, {
      entity_count: entityCount,
      decision_count: decisionCount,
      narrative_count: narrativeCount,
    });
  }

  /**
   * Query memories across studio projects.
   * All results are non-authoritative projections.
   */
  async queryStudioMemory(request: MemoryQueryRequest): Promise<MemoryQueryResult> {
    // FC-NF: Validate requester identity
    if (!request.requester_identity) {
      throw new MemoryQueryValidationError('requester_identity is required');
    }

    // FC-NF: Validate capability reference
    if (!request.capability_ref) {
      throw new MemoryQueryValidationError('capability_ref is required');
    }

    // FC-NF: Validate studio scope
    if (!request.studio_scope) {
      throw new MemoryQueryValidationError('studio_scope is required');
    }
    if (request.studio_scope !== this.studioId) {
      throw new MemoryQueryValidationError(
        `Studio scope mismatch: requested ${request.studio_scope}, service bound to ${this.studioId}`
      );
    }

    // FC-NF: Validate entity types declared
    if (!request.entity_types || request.entity_types.length === 0) {
      throw new MemoryQueryValidationError('entity_types must be explicitly declared');
    }

    // FC-NF: Validate memory kinds
    const validKinds: MemoryKind[] = ['decision', 'narrative', 'intent', 'ai_trace'];
    for (const kind of request.memory_kinds) {
      if (!validKinds.includes(kind)) {
        throw new MemoryQueryValidationError(`Invalid memory_kind: ${kind}`);
      }
    }

    // Build source projects
    const sourceProjects: MemoryQueryResult['source_projects'] = [];
    for (const [pid, info] of this.registeredProjects) {
      sourceProjects.push({
        project_id: pid,
        entity_count: info.entity_count,
        canonical_source: 'project_local_cdg',
      });
    }

    return {
      query_id: request.query_id,
      authoritative: false as const,
      source_projects: sourceProjects,
      results: [],
      projection_timestamp: new Date().toISOString(),
      staleness_warning: false,
    };
  }

  /**
   * Shared decisions across projects.
   * Returns non-authoritative summary.
   */
  async getSharedDecisionMemory(
    studioId: string,
    entityTypes: string[]
  ): Promise<SharedDecisionMemory> {
    if (studioId !== this.studioId) {
      throw new MemoryQueryValidationError(
        `Studio scope mismatch: requested ${studioId}, service bound to ${this.studioId}`
      );
    }

    if (!entityTypes || entityTypes.length === 0) {
      throw new MemoryQueryValidationError('entity_types must be explicitly declared');
    }

    let totalDecisions = 0;
    for (const [, info] of this.registeredProjects) {
      totalDecisions += info.decision_count;
    }

    return {
      studio_id: studioId,
      authoritative: false as const,
      decisions_count: totalDecisions,
      projects_contributing: this.registeredProjects.size,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Cross-project narrative overview.
   * Returns non-authoritative projection.
   */
  async getNarrativeMemoryProjection(studioId: string): Promise<NarrativeMemoryProjection> {
    if (studioId !== this.studioId) {
      throw new MemoryQueryValidationError(
        `Studio scope mismatch: requested ${studioId}, service bound to ${this.studioId}`
      );
    }

    const sourceProjectIds = Array.from(this.registeredProjects.keys());
    let totalNarratives = 0;
    for (const [, info] of this.registeredProjects) {
      totalNarratives += info.narrative_count;
    }

    return {
      studio_id: studioId,
      authoritative: false as const,
      narratives_count: totalNarratives,
      source_projects: sourceProjectIds,
      generated_at: new Date().toISOString(),
    };
  }
}
