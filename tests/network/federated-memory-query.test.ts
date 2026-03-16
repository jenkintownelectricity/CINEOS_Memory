/**
 * Wave 8 Network Tests - FederatedMemoryQueryService
 *
 * Validates kernel law enforcement:
 *   - Results authoritative: false
 *   - Fail-closed on missing identity
 *   - Studio scope enforcement
 *   - Valid memory kinds enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FederatedMemoryQueryService,
  MemoryQueryValidationError,
} from '../../src/intelligence/federated-memory-query';
import type { MemoryQueryRequest } from '../../src/intelligence/federated-memory-query';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const studioId = 'stid-00000000-0000-0000-0000-000000000001';
const projectId = 'proj-001';

function makeService(): FederatedMemoryQueryService {
  const svc = new FederatedMemoryQueryService(studioId, projectId);
  svc.registerProject('proj-001', 10, 5, 3);
  svc.registerProject('proj-002', 20, 8, 6);
  return svc;
}

function makeRequest(overrides: Partial<MemoryQueryRequest> = {}): MemoryQueryRequest {
  return {
    query_id: 'q-001',
    requester_identity: 'huid-00000000-0000-0000-0000-000000000001',
    capability_ref: 'grant-001',
    studio_scope: studioId,
    entity_types: ['decision', 'narrative'],
    memory_kinds: ['decision', 'narrative'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FederatedMemoryQueryService', () => {
  let service: FederatedMemoryQueryService;

  beforeEach(() => {
    service = makeService();
  });

  // -------------------------------------------------------------------------
  // Results authoritative: false
  // -------------------------------------------------------------------------

  describe('results authoritative: false', () => {
    it('queryStudioMemory returns authoritative: false', async () => {
      const result = await service.queryStudioMemory(makeRequest());
      expect(result.authoritative).toBe(false);
    });

    it('authoritative is literally false, not falsy', async () => {
      const result = await service.queryStudioMemory(makeRequest());
      expect(result.authoritative).toStrictEqual(false);
    });

    it('source projects have canonical_source: project_local_cdg', async () => {
      const result = await service.queryStudioMemory(makeRequest());
      for (const sp of result.source_projects) {
        expect(sp.canonical_source).toBe('project_local_cdg');
      }
    });

    it('result includes query_id from request', async () => {
      const result = await service.queryStudioMemory(makeRequest());
      expect(result.query_id).toBe('q-001');
    });

    it('result includes projection_timestamp', async () => {
      const result = await service.queryStudioMemory(makeRequest());
      expect(result.projection_timestamp).toBeDefined();
      expect(typeof result.projection_timestamp).toBe('string');
    });

    it('shared decision memory is non-authoritative', async () => {
      const memory = await service.getSharedDecisionMemory(studioId, ['decision']);
      expect(memory.authoritative).toBe(false);
      expect(memory.decisions_count).toBe(13);
      expect(memory.projects_contributing).toBe(2);
    });

    it('narrative memory projection is non-authoritative', async () => {
      const proj = await service.getNarrativeMemoryProjection(studioId);
      expect(proj.authoritative).toBe(false);
      expect(proj.narratives_count).toBe(9);
      expect(proj.source_projects.length).toBe(2);
    });

    it('shared decision memory aggregates correctly', async () => {
      const memory = await service.getSharedDecisionMemory(studioId, ['decision']);
      // 5 from proj-001 + 8 from proj-002 = 13
      expect(memory.decisions_count).toBe(13);
    });

    it('narrative memory includes all source projects', async () => {
      const proj = await service.getNarrativeMemoryProjection(studioId);
      expect(proj.source_projects).toContain('proj-001');
      expect(proj.source_projects).toContain('proj-002');
    });
  });

  // -------------------------------------------------------------------------
  // Fail-closed on missing identity
  // -------------------------------------------------------------------------

  describe('fail-closed on missing identity', () => {
    it('rejects missing requester_identity (empty)', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ requester_identity: '' })),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('rejects missing requester_identity (undefined)', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ requester_identity: undefined as any })),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('error message references requester_identity', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ requester_identity: '' })),
      ).rejects.toThrow(/requester_identity/);
    });

    it('rejects missing capability_ref (empty)', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ capability_ref: '' })),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('rejects missing capability_ref (undefined)', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ capability_ref: undefined as any })),
      ).rejects.toThrow(MemoryQueryValidationError);
    });
  });

  // -------------------------------------------------------------------------
  // Studio scope enforcement
  // -------------------------------------------------------------------------

  describe('studio scope enforcement', () => {
    it('rejects empty studio_scope', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ studio_scope: '' })),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('rejects studio scope mismatch', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ studio_scope: 'stid-wrong' })),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('error message references scope mismatch', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ studio_scope: 'stid-wrong' })),
      ).rejects.toThrow(/scope mismatch/i);
    });

    it('getSharedDecisionMemory rejects mismatched studio', async () => {
      await expect(
        service.getSharedDecisionMemory('stid-wrong', ['decision']),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('getNarrativeMemoryProjection rejects mismatched studio', async () => {
      await expect(
        service.getNarrativeMemoryProjection('stid-wrong'),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('accepts correct studio scope', async () => {
      const result = await service.queryStudioMemory(makeRequest({ studio_scope: studioId }));
      expect(result.authoritative).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Valid memory kinds enforcement
  // -------------------------------------------------------------------------

  describe('valid memory kinds enforcement', () => {
    it('accepts decision kind', async () => {
      const result = await service.queryStudioMemory(
        makeRequest({ memory_kinds: ['decision'] }),
      );
      expect(result.authoritative).toBe(false);
    });

    it('accepts narrative kind', async () => {
      const result = await service.queryStudioMemory(
        makeRequest({ memory_kinds: ['narrative'] }),
      );
      expect(result.authoritative).toBe(false);
    });

    it('accepts intent kind', async () => {
      const result = await service.queryStudioMemory(
        makeRequest({ memory_kinds: ['intent'] }),
      );
      expect(result.authoritative).toBe(false);
    });

    it('accepts ai_trace kind', async () => {
      const result = await service.queryStudioMemory(
        makeRequest({ memory_kinds: ['ai_trace'] }),
      );
      expect(result.authoritative).toBe(false);
    });

    it('accepts all valid kinds together', async () => {
      const result = await service.queryStudioMemory(
        makeRequest({ memory_kinds: ['decision', 'narrative', 'intent', 'ai_trace'] }),
      );
      expect(result.authoritative).toBe(false);
    });

    it('rejects invalid memory_kind', async () => {
      await expect(
        service.queryStudioMemory(
          makeRequest({ memory_kinds: ['invalid_kind' as any] }),
        ),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('rejects mixed valid and invalid kinds', async () => {
      await expect(
        service.queryStudioMemory(
          makeRequest({ memory_kinds: ['decision', 'bogus' as any] }),
        ),
      ).rejects.toThrow(MemoryQueryValidationError);
    });
  });

  // -------------------------------------------------------------------------
  // Entity types required
  // -------------------------------------------------------------------------

  describe('entity types required', () => {
    it('rejects empty entity_types', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ entity_types: [] })),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('rejects undefined entity_types', async () => {
      await expect(
        service.queryStudioMemory(makeRequest({ entity_types: undefined as any })),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('getSharedDecisionMemory rejects empty entity_types', async () => {
      await expect(
        service.getSharedDecisionMemory(studioId, []),
      ).rejects.toThrow(MemoryQueryValidationError);
    });

    it('accepts valid entity_types', async () => {
      const result = await service.queryStudioMemory(
        makeRequest({ entity_types: ['shot'] }),
      );
      expect(result.authoritative).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Constructor validation
  // -------------------------------------------------------------------------

  describe('constructor validation', () => {
    it('throws on missing studioId', () => {
      expect(() => new FederatedMemoryQueryService('', projectId)).toThrow(
        MemoryQueryValidationError,
      );
    });

    it('throws on missing projectId', () => {
      expect(() => new FederatedMemoryQueryService(studioId, '')).toThrow(
        MemoryQueryValidationError,
      );
    });
  });
});
