/**
 * AgentMemoryBridge
 * CINEOS Memory — Wave 9 (Autonomous Studio)
 *
 * Bridges agent workflows to the memory system. Agents can READ memory
 * surfaces within their authorized scope. Agents CANNOT write canonical
 * memory directly — they create proposals instead. All reads preserve
 * source project/studio identity. No globally writable memory access.
 */

export interface MemoryReadRequest {
  request_id: string;
  agent_id: string;
  identity_type: 'ai_agent';
  capability_ref: string;
  memory_surface: string;
  query: Record<string, unknown>;
  source_project_id: string;
  source_studio_id: string;
  requested_at: string;
}

export interface MemoryReadResult {
  request_id: string;
  agent_id: string;
  memory_surface: string;
  result_data: Record<string, unknown>;
  authoritative: false;
  source_project_id: string;
  source_studio_id: string;
  result_count: number;
  bounded: true;
  resolved_at: string;
}

export interface MemoryWriteProposal {
  proposal_id: string;
  agent_id: string;
  identity_type: 'ai_agent';
  capability_ref: string;
  provenance_binding_ref: string;
  target_surface: string;
  proposed_data: Record<string, unknown>;
  authoritative: false;
  status: 'pending_approval';
  source_project_id: string;
  source_studio_id: string;
  created_at: string;
}

export class AgentMemoryBridge {
  private reads: MemoryReadResult[] = [];
  private writeProposals: MemoryWriteProposal[] = [];
  private readonly allowedSurfaces: string[];
  private readonly maxReadsPerSession: number;
  private readonly maxQueryFanOut: number;
  private readCount: number = 0;

  constructor(config: { allowed_surfaces: string[]; max_reads_per_session: number; max_query_fan_out: number }) {
    this.allowedSurfaces = config.allowed_surfaces;
    this.maxReadsPerSession = config.max_reads_per_session;
    this.maxQueryFanOut = config.max_query_fan_out;
  }

  readMemory(params: {
    agent_id: string;
    capability_ref: string;
    memory_surface: string;
    query: Record<string, unknown>;
    source_project_id: string;
    source_studio_id: string;
  }): MemoryReadResult {
    if (!params.agent_id) {
      throw new Error('Fail-closed: agent_id is required');
    }
    if (!params.capability_ref) {
      throw new Error('Fail-closed: capability_ref is required');
    }
    if (!this.validateSurfaceAccess(params.memory_surface)) {
      throw new Error(`Fail-closed: memory_surface '${params.memory_surface}' is not in allowed surfaces — dataset access boundary enforced`);
    }
    if (!params.source_project_id) {
      throw new Error('Fail-closed: source_project_id is required');
    }
    if (!params.source_studio_id) {
      throw new Error('Fail-closed: source_studio_id is required');
    }
    if (this.readCount >= this.maxReadsPerSession) {
      throw new Error(`Fail-closed: read limit reached (${this.maxReadsPerSession} reads per session)`);
    }

    const result: MemoryReadResult = {
      request_id: crypto.randomUUID(),
      agent_id: params.agent_id,
      memory_surface: params.memory_surface,
      result_data: { entries: [] },
      authoritative: false,
      source_project_id: params.source_project_id,
      source_studio_id: params.source_studio_id,
      result_count: 0,
      bounded: true,
      resolved_at: new Date().toISOString(),
    };

    this.readCount++;
    this.reads.push(result);
    return result;
  }

  proposeMemoryWrite(params: {
    agent_id: string;
    capability_ref: string;
    provenance_binding_ref: string;
    target_surface: string;
    proposed_data: Record<string, unknown>;
    source_project_id: string;
    source_studio_id: string;
  }): MemoryWriteProposal {
    if (!params.agent_id) {
      throw new Error('Fail-closed: agent_id is required');
    }
    if (!params.capability_ref) {
      throw new Error('Fail-closed: capability_ref is required');
    }
    if (!params.provenance_binding_ref) {
      throw new Error('Fail-closed: provenance_binding_ref is required');
    }
    if (!params.target_surface) {
      throw new Error('Fail-closed: target_surface is required');
    }
    if (!params.source_project_id) {
      throw new Error('Fail-closed: source_project_id is required');
    }
    if (!params.source_studio_id) {
      throw new Error('Fail-closed: source_studio_id is required');
    }
    if (!this.validateSurfaceAccess(params.target_surface)) {
      throw new Error(`Fail-closed: target_surface '${params.target_surface}' is not in allowed surfaces`);
    }

    const proposal: MemoryWriteProposal = {
      proposal_id: crypto.randomUUID(),
      agent_id: params.agent_id,
      identity_type: 'ai_agent',
      capability_ref: params.capability_ref,
      provenance_binding_ref: params.provenance_binding_ref,
      target_surface: params.target_surface,
      proposed_data: params.proposed_data,
      authoritative: false,
      status: 'pending_approval',
      source_project_id: params.source_project_id,
      source_studio_id: params.source_studio_id,
      created_at: new Date().toISOString(),
    };

    this.writeProposals.push(proposal);
    return proposal;
  }

  getReads(): MemoryReadResult[] {
    return [...this.reads];
  }

  getWriteProposals(): MemoryWriteProposal[] {
    return [...this.writeProposals];
  }

  getReadCount(): number {
    return this.readCount;
  }

  getMaxReadsPerSession(): number {
    return this.maxReadsPerSession;
  }

  isReadLimitReached(): boolean {
    return this.readCount >= this.maxReadsPerSession;
  }

  validateSurfaceAccess(surface: string): boolean {
    return this.allowedSurfaces.includes(surface);
  }
}
