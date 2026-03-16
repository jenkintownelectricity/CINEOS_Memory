import { describe, it, expect, beforeEach } from 'vitest';
import { AgentMemoryBridge } from '../../src/autonomy/agent-memory-bridge';

describe('AgentMemoryBridge', () => {
  const allowedSurfaces = ['timeline', 'metadata', 'annotations'];
  let bridge: AgentMemoryBridge;

  const validReadParams = {
    agent_id: 'agent-001',
    capability_ref: 'cap-read-timeline',
    memory_surface: 'timeline',
    query: { filter: 'recent' },
    source_project_id: 'proj-100',
    source_studio_id: 'studio-200',
  };

  const validWriteParams = {
    agent_id: 'agent-001',
    capability_ref: 'cap-write-timeline',
    provenance_binding_ref: 'prov-bind-001',
    target_surface: 'timeline',
    proposed_data: { key: 'value' },
    source_project_id: 'proj-100',
    source_studio_id: 'studio-200',
  };

  beforeEach(() => {
    bridge = new AgentMemoryBridge({
      allowed_surfaces: allowedSurfaces,
      max_reads_per_session: 5,
      max_query_fan_out: 3,
    });
  });

  describe('readMemory', () => {
    it('succeeds with valid params', () => {
      const result = bridge.readMemory(validReadParams);
      expect(result).toBeDefined();
      expect(result.request_id).toBeTruthy();
      expect(result.agent_id).toBe('agent-001');
      expect(result.memory_surface).toBe('timeline');
      expect(result.resolved_at).toBeTruthy();
    });

    it('result has authoritative = false, bounded = true', () => {
      const result = bridge.readMemory(validReadParams);
      expect(result.authoritative).toBe(false);
      expect(result.bounded).toBe(true);
    });

    it('preserves source_project_id and source_studio_id', () => {
      const result = bridge.readMemory(validReadParams);
      expect(result.source_project_id).toBe('proj-100');
      expect(result.source_studio_id).toBe('studio-200');
    });

    it('throws Error when agent_id is missing', () => {
      expect(() =>
        bridge.readMemory({ ...validReadParams, agent_id: '' })
      ).toThrow('agent_id is required');
    });

    it('throws Error when capability_ref is missing', () => {
      expect(() =>
        bridge.readMemory({ ...validReadParams, capability_ref: '' })
      ).toThrow('capability_ref is required');
    });

    it('throws Error for non-allowed surface (dataset boundary)', () => {
      expect(() =>
        bridge.readMemory({ ...validReadParams, memory_surface: 'restricted_dataset' })
      ).toThrow("memory_surface 'restricted_dataset' is not in allowed surfaces");
    });

    it('throws Error when read session limit is exceeded', () => {
      for (let i = 0; i < 5; i++) {
        bridge.readMemory(validReadParams);
      }
      expect(() => bridge.readMemory(validReadParams)).toThrow(
        'read limit reached (5 reads per session)'
      );
    });
  });

  describe('proposeMemoryWrite', () => {
    it('creates proposal with authoritative = false, status = pending_approval', () => {
      const proposal = bridge.proposeMemoryWrite(validWriteParams);
      expect(proposal).toBeDefined();
      expect(proposal.proposal_id).toBeTruthy();
      expect(proposal.authoritative).toBe(false);
      expect(proposal.status).toBe('pending_approval');
      expect(proposal.identity_type).toBe('ai_agent');
      expect(proposal.agent_id).toBe('agent-001');
      expect(proposal.capability_ref).toBe('cap-write-timeline');
      expect(proposal.provenance_binding_ref).toBe('prov-bind-001');
      expect(proposal.source_project_id).toBe('proj-100');
      expect(proposal.source_studio_id).toBe('studio-200');
      expect(proposal.created_at).toBeTruthy();
    });

    it('stores proposal in writeProposals list', () => {
      bridge.proposeMemoryWrite(validWriteParams);
      const proposals = bridge.getWriteProposals();
      expect(proposals).toHaveLength(1);
    });

    it('throws Error for non-allowed target_surface', () => {
      expect(() =>
        bridge.proposeMemoryWrite({ ...validWriteParams, target_surface: 'forbidden' })
      ).toThrow("target_surface 'forbidden' is not in allowed surfaces");
    });
  });

  describe('validateSurfaceAccess', () => {
    it('returns true for allowed surfaces', () => {
      expect(bridge.validateSurfaceAccess('timeline')).toBe(true);
      expect(bridge.validateSurfaceAccess('metadata')).toBe(true);
      expect(bridge.validateSurfaceAccess('annotations')).toBe(true);
    });

    it('returns false for disallowed surfaces', () => {
      expect(bridge.validateSurfaceAccess('secret_data')).toBe(false);
      expect(bridge.validateSurfaceAccess('')).toBe(false);
    });
  });
});
