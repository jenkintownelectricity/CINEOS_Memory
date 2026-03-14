"""
CINEOS Memory — Pydantic models for canonical entities.

MEMORY RULE: Memory is a derived layer, NOT canonical truth.
Canonical truth lives in contracts, relational store, event ledger,
and provenance graph.  Models here describe the *shape* of derived
memory artefacts and the creative-decision records that feed them.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from .ulid import generate_ulid


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class MemoryType(str, enum.Enum):
    """What kind of memory item this is."""
    DECISION = "decision"
    INSIGHT = "insight"
    OBSERVATION = "observation"
    RATIONALE = "rationale"
    PREFERENCE = "preference"
    PATTERN = "pattern"


class DecisionType(str, enum.Enum):
    """Domain of a creative decision."""
    EDITORIAL = "editorial"
    COLOR = "color"
    SOUND = "sound"
    COMPOSITION = "composition"
    NARRATIVE = "narrative"
    CASTING = "casting"
    LIGHTING = "lighting"


class ApprovalStatus(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"
    PENDING = "pending"


class IntentLevel(str, enum.Enum):
    PROJECT = "project"
    SCENE = "scene"
    SHOT = "shot"


# ---------------------------------------------------------------------------
# Canonical entity: AuditEvent
# ---------------------------------------------------------------------------

class AuditEvent(BaseModel):
    """
    Immutable record of something that happened.
    This is the canonical source from which memory items are *derived*.
    """
    id: str = Field(default_factory=generate_ulid)
    tenant_id: str
    event_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    actor_id: Optional[str] = None
    payload: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"frozen": True}


# ---------------------------------------------------------------------------
# Canonical entity: MemoryItem  (derived — never the source of truth)
# ---------------------------------------------------------------------------

class MemoryItem(BaseModel):
    """
    A chunk of durable creative memory derived from events, decisions,
    or user actions.  Always points back to the source event that
    caused its creation.
    """
    id: str = Field(default_factory=generate_ulid)
    tenant_id: str
    project_id: str
    type: MemoryType
    content: str
    source_event_id: str
    source_entity_type: Optional[str] = None
    source_entity_id: Optional[str] = None
    embedding_vector: Optional[list[float]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Canonical entity: CreativeDecision
# ---------------------------------------------------------------------------

class CreativeDecision(BaseModel):
    """
    Record of a creative choice, its rationale, and the alternatives
    that were considered.  Links into the provenance chain.
    """
    id: str = Field(default_factory=generate_ulid)
    tenant_id: str
    project_id: str
    decision_type: DecisionType
    description: str
    rationale: str
    alternatives_considered: list[str] = Field(default_factory=list)
    chosen_option: str
    author_id: str
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None
    provenance_link_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Creative Intent
# ---------------------------------------------------------------------------

class CreativeIntent(BaseModel):
    """Snapshot of creative intent at a given scope and point in time."""
    id: str = Field(default_factory=generate_ulid)
    tenant_id: str
    project_id: str
    level: IntentLevel
    scope_id: Optional[str] = None  # scene_id or shot_id when applicable
    description: str
    author_id: str
    version: int = 1
    parent_intent_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Approval Record
# ---------------------------------------------------------------------------

class ApprovalRecord(BaseModel):
    """Captures why something was approved, rejected, or sent back."""
    id: str = Field(default_factory=generate_ulid)
    tenant_id: str
    project_id: str
    status: ApprovalStatus
    rationale: str
    approver_id: str
    related_entity_type: str
    related_entity_id: str
    review_thread_id: Optional[str] = None
    comment_ids: list[str] = Field(default_factory=list)
    parent_approval_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
