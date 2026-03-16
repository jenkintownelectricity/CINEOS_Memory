/**
 * AutonomyAuditability
 * CINEOS Memory — Wave 9 (Autonomous Studio)
 *
 * Provides a complete audit trail for all autonomous actions. Every agent
 * action, proposal, approval, rejection, read, and recommendation is
 * recorded. Supports replay of proposal-to-approval transitions.
 * All audit entries are immutable once recorded.
 */

export type AuditEventType =
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_expired'
  | 'recommendation_generated'
  | 'memory_read'
  | 'qc_check'
  | 'render_plan'
  | 'optimization_suggestion'
  | 'capability_granted'
  | 'capability_revoked'
  | 'agent_registered';

export interface AuditEntry {
  audit_id: string;
  event_type: AuditEventType;
  actor_id: string;
  actor_identity_type: 'human_user' | 'ai_agent' | 'service';
  related_entity_id: string;
  capability_ref: string;
  provenance_binding_ref?: string;
  event_data: Record<string, unknown>;
  source_project_id: string;
  source_studio_id: string;
  timestamp: string;
  sequence_number: number;
}

export class AutonomyAuditability {
  private entries: AuditEntry[] = [];
  private sequenceCounter: number = 0;

  recordEvent(params: {
    event_type: AuditEventType;
    actor_id: string;
    actor_identity_type: 'human_user' | 'ai_agent' | 'service';
    related_entity_id: string;
    capability_ref: string;
    provenance_binding_ref?: string;
    event_data: Record<string, unknown>;
    source_project_id: string;
    source_studio_id: string;
  }): AuditEntry {
    if (!params.actor_id) {
      throw new Error('Fail-closed: actor_id is required');
    }
    if (!params.capability_ref) {
      throw new Error('Fail-closed: capability_ref is required');
    }
    if (!params.source_project_id) {
      throw new Error('Fail-closed: source_project_id is required');
    }
    if (!params.source_studio_id) {
      throw new Error('Fail-closed: source_studio_id is required');
    }

    this.sequenceCounter++;

    const entry: AuditEntry = {
      audit_id: crypto.randomUUID(),
      event_type: params.event_type,
      actor_id: params.actor_id,
      actor_identity_type: params.actor_identity_type,
      related_entity_id: params.related_entity_id,
      capability_ref: params.capability_ref,
      provenance_binding_ref: params.provenance_binding_ref,
      event_data: params.event_data,
      source_project_id: params.source_project_id,
      source_studio_id: params.source_studio_id,
      timestamp: new Date().toISOString(),
      sequence_number: this.sequenceCounter,
    };

    this.entries.push(entry);
    return entry;
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getEntriesByActor(actor_id: string): AuditEntry[] {
    return this.entries.filter((e) => e.actor_id === actor_id);
  }

  getEntriesByEventType(event_type: AuditEventType): AuditEntry[] {
    return this.entries.filter((e) => e.event_type === event_type);
  }

  getEntriesByEntity(entity_id: string): AuditEntry[] {
    return this.entries.filter((e) => e.related_entity_id === entity_id);
  }

  getEntriesByProject(project_id: string): AuditEntry[] {
    return this.entries.filter((e) => e.source_project_id === project_id);
  }

  replayProposalTransitions(proposal_id: string): AuditEntry[] {
    return this.entries
      .filter((e) => e.related_entity_id === proposal_id)
      .sort((a, b) => a.sequence_number - b.sequence_number);
  }

  getSequenceCount(): number {
    return this.sequenceCounter;
  }

  verifySequenceIntegrity(): boolean {
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].sequence_number !== i + 1) {
        return false;
      }
    }
    return true;
  }
}
