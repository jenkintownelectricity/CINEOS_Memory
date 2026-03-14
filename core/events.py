"""
CINEOS Memory — CloudEvents definitions.

All events follow the CloudEvents v1.0 specification.
Events emitted by this domain:

  memory.item.created
  creative.decision.recorded
  creative.intent.updated
  approval.recorded
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from .ulid import generate_ulid

# CloudEvents spec version
_CE_SPEC_VERSION = "1.0"
_SOURCE_PREFIX = "cineos://memory"


class CloudEvent(BaseModel):
    """
    CloudEvents v1.0 envelope.
    https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
    """
    id: str = Field(default_factory=generate_ulid)
    source: str = _SOURCE_PREFIX
    specversion: str = _CE_SPEC_VERSION
    type: str
    subject: Optional[str] = None
    time: datetime = Field(default_factory=datetime.utcnow)
    datacontenttype: str = "application/json"
    data: dict[str, Any] = Field(default_factory=dict)
    tenant_id: str  # extension attribute

    model_config = {"frozen": True}


# ---------------------------------------------------------------------------
# Event type constants
# ---------------------------------------------------------------------------

MEMORY_ITEM_CREATED = "memory.item.created"
CREATIVE_DECISION_RECORDED = "creative.decision.recorded"
CREATIVE_INTENT_UPDATED = "creative.intent.updated"
APPROVAL_RECORDED = "approval.recorded"


# ---------------------------------------------------------------------------
# Factory helpers — produce correctly-typed CloudEvent instances
# ---------------------------------------------------------------------------

def memory_item_created(
    tenant_id: str,
    memory_item_id: str,
    project_id: str,
    memory_type: str,
    source_event_id: str,
    extra: dict[str, Any] | None = None,
) -> CloudEvent:
    data = {
        "memory_item_id": memory_item_id,
        "project_id": project_id,
        "memory_type": memory_type,
        "source_event_id": source_event_id,
        **(extra or {}),
    }
    return CloudEvent(
        type=MEMORY_ITEM_CREATED,
        subject=memory_item_id,
        tenant_id=tenant_id,
        data=data,
    )


def creative_decision_recorded(
    tenant_id: str,
    decision_id: str,
    project_id: str,
    decision_type: str,
    author_id: str,
    extra: dict[str, Any] | None = None,
) -> CloudEvent:
    data = {
        "decision_id": decision_id,
        "project_id": project_id,
        "decision_type": decision_type,
        "author_id": author_id,
        **(extra or {}),
    }
    return CloudEvent(
        type=CREATIVE_DECISION_RECORDED,
        subject=decision_id,
        tenant_id=tenant_id,
        data=data,
    )


def creative_intent_updated(
    tenant_id: str,
    intent_id: str,
    project_id: str,
    level: str,
    version: int,
    extra: dict[str, Any] | None = None,
) -> CloudEvent:
    data = {
        "intent_id": intent_id,
        "project_id": project_id,
        "level": level,
        "version": version,
        **(extra or {}),
    }
    return CloudEvent(
        type=CREATIVE_INTENT_UPDATED,
        subject=intent_id,
        tenant_id=tenant_id,
        data=data,
    )


def approval_recorded(
    tenant_id: str,
    approval_id: str,
    project_id: str,
    status: str,
    approver_id: str,
    extra: dict[str, Any] | None = None,
) -> CloudEvent:
    data = {
        "approval_id": approval_id,
        "project_id": project_id,
        "status": status,
        "approver_id": approver_id,
        **(extra or {}),
    }
    return CloudEvent(
        type=APPROVAL_RECORDED,
        subject=approval_id,
        tenant_id=tenant_id,
        data=data,
    )
