import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomyAuditability } from '../../src/autonomy/autonomy-auditability';

describe('AutonomyAuditability', () => {
  let audit: AutonomyAuditability;

  const baseEventParams = {
    event_type: 'proposal_created' as const,
    actor_id: 'agent-001',
    actor_identity_type: 'ai_agent' as const,
    related_entity_id: 'proposal-abc',
    capability_ref: 'cap-render-plan',
    event_data: { detail: 'test event' },
    source_project_id: 'proj-100',
    source_studio_id: 'studio-200',
  };

  beforeEach(() => {
    audit = new AutonomyAuditability();
  });

  describe('recordEvent', () => {
    it('succeeds and has auto-incrementing sequence', () => {
      const entry1 = audit.recordEvent(baseEventParams);
      const entry2 = audit.recordEvent({ ...baseEventParams, event_type: 'proposal_approved' });
      const entry3 = audit.recordEvent({ ...baseEventParams, event_type: 'memory_read' });

      expect(entry1.sequence_number).toBe(1);
      expect(entry2.sequence_number).toBe(2);
      expect(entry3.sequence_number).toBe(3);
      expect(entry1.audit_id).toBeTruthy();
      expect(entry1.timestamp).toBeTruthy();
    });

    it('throws Error when actor_id is missing', () => {
      expect(() =>
        audit.recordEvent({ ...baseEventParams, actor_id: '' })
      ).toThrow('actor_id is required');
    });

    it('throws Error when capability_ref is missing', () => {
      expect(() =>
        audit.recordEvent({ ...baseEventParams, capability_ref: '' })
      ).toThrow('capability_ref is required');
    });
  });

  describe('getEntries', () => {
    it('returns a copy, not a mutable reference', () => {
      audit.recordEvent(baseEventParams);
      const entries = audit.getEntries();
      entries.push({} as any);
      expect(audit.getEntries()).toHaveLength(1);
    });
  });

  describe('filter methods', () => {
    beforeEach(() => {
      audit.recordEvent(baseEventParams);
      audit.recordEvent({
        ...baseEventParams,
        actor_id: 'agent-002',
        event_type: 'memory_read',
        related_entity_id: 'entity-xyz',
        source_project_id: 'proj-999',
      });
      audit.recordEvent({
        ...baseEventParams,
        event_type: 'proposal_approved',
      });
    });

    it('getEntriesByActor filters correctly', () => {
      const results = audit.getEntriesByActor('agent-001');
      expect(results).toHaveLength(2);
      results.forEach((e) => expect(e.actor_id).toBe('agent-001'));
    });

    it('getEntriesByEventType filters correctly', () => {
      const results = audit.getEntriesByEventType('memory_read');
      expect(results).toHaveLength(1);
      expect(results[0].event_type).toBe('memory_read');
    });

    it('getEntriesByEntity filters correctly', () => {
      const results = audit.getEntriesByEntity('entity-xyz');
      expect(results).toHaveLength(1);
      expect(results[0].related_entity_id).toBe('entity-xyz');
    });

    it('getEntriesByProject filters correctly', () => {
      const results = audit.getEntriesByProject('proj-999');
      expect(results).toHaveLength(1);
      expect(results[0].source_project_id).toBe('proj-999');
    });
  });

  describe('replayProposalTransitions', () => {
    it('returns events in sequence order', () => {
      const proposalId = 'proposal-replay-001';
      audit.recordEvent({
        ...baseEventParams,
        event_type: 'proposal_created',
        related_entity_id: proposalId,
      });
      audit.recordEvent({
        ...baseEventParams,
        event_type: 'proposal_approved',
        related_entity_id: proposalId,
      });

      const transitions = audit.replayProposalTransitions(proposalId);
      expect(transitions).toHaveLength(2);
      expect(transitions[0].sequence_number).toBeLessThan(transitions[1].sequence_number);
    });

    it('shows proposal and approval as distinct events', () => {
      const proposalId = 'proposal-distinct-001';
      audit.recordEvent({
        ...baseEventParams,
        event_type: 'proposal_created',
        related_entity_id: proposalId,
      });
      audit.recordEvent({
        ...baseEventParams,
        event_type: 'proposal_approved',
        related_entity_id: proposalId,
        actor_id: 'human-reviewer',
        actor_identity_type: 'human_user',
      });

      const transitions = audit.replayProposalTransitions(proposalId);
      expect(transitions[0].event_type).toBe('proposal_created');
      expect(transitions[0].actor_identity_type).toBe('ai_agent');
      expect(transitions[1].event_type).toBe('proposal_approved');
      expect(transitions[1].actor_identity_type).toBe('human_user');
    });
  });

  describe('verifySequenceIntegrity', () => {
    it('returns true for valid sequence', () => {
      audit.recordEvent(baseEventParams);
      audit.recordEvent({ ...baseEventParams, event_type: 'proposal_approved' });
      audit.recordEvent({ ...baseEventParams, event_type: 'memory_read' });

      expect(audit.verifySequenceIntegrity()).toBe(true);
    });

    it('returns true for empty audit log', () => {
      expect(audit.verifySequenceIntegrity()).toBe(true);
    });
  });
});
