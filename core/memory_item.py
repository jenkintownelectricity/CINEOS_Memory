"""
CINEOS Memory — Memory Item derivation engine.

Memory items are DERIVED artefacts.  They are produced by generation
rules that fire when specific events, decisions, or user actions arrive.
A memory item always records *which* source event caused its creation so
the provenance chain is never broken.

Generation rules
----------------
The ``MemoryDerivationEngine`` holds a registry of rules.  Each rule is a
callable ``(AuditEvent) -> MemoryItem | None``.  When the engine receives
an event it runs every matching rule and stores the resulting items.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Callable, Optional

from .models import AuditEvent, MemoryItem, MemoryType
from .ulid import generate_ulid


# ---------------------------------------------------------------------------
# Rule type
# ---------------------------------------------------------------------------

GenerationRule = Callable[[AuditEvent], Optional[MemoryItem]]


# ---------------------------------------------------------------------------
# Derivation engine
# ---------------------------------------------------------------------------

class MemoryDerivationEngine:
    """
    Watches events and derives memory items according to registered
    generation rules.

    Usage::

        engine = MemoryDerivationEngine()
        engine.register_rule("decision_made", derive_decision_memory)
        items = engine.process(event)
    """

    def __init__(self) -> None:
        # event_type -> list of rules
        self._rules: dict[str, list[GenerationRule]] = {}

    def register_rule(
        self,
        event_type: str,
        rule: GenerationRule,
    ) -> None:
        """Register a generation rule that fires for *event_type*."""
        self._rules.setdefault(event_type, []).append(rule)

    def process(self, event: AuditEvent) -> list[MemoryItem]:
        """
        Run all matching rules against *event* and return any
        memory items that were derived.
        """
        rules = self._rules.get(event.event_type, [])
        items: list[MemoryItem] = []
        for rule in rules:
            item = rule(event)
            if item is not None:
                items.append(item)
        return items


# ---------------------------------------------------------------------------
# Built-in generation rules
# ---------------------------------------------------------------------------

def derive_decision_memory(event: AuditEvent) -> Optional[MemoryItem]:
    """
    When a creative decision is recorded, derive a ``decision``
    memory item capturing the description and rationale.
    """
    p = event.payload
    description = p.get("description", "")
    rationale = p.get("rationale", "")
    if not description:
        return None
    content = f"Decision: {description}"
    if rationale:
        content += f" | Rationale: {rationale}"
    return MemoryItem(
        tenant_id=event.tenant_id,
        project_id=p.get("project_id", ""),
        type=MemoryType.DECISION,
        content=content,
        source_event_id=event.id,
        source_entity_type=event.entity_type,
        source_entity_id=event.entity_id,
    )


def derive_observation_memory(event: AuditEvent) -> Optional[MemoryItem]:
    """Generic observation from any event that carries a ``note`` payload."""
    note = event.payload.get("note")
    if not note:
        return None
    return MemoryItem(
        tenant_id=event.tenant_id,
        project_id=event.payload.get("project_id", ""),
        type=MemoryType.OBSERVATION,
        content=note,
        source_event_id=event.id,
        source_entity_type=event.entity_type,
        source_entity_id=event.entity_id,
    )


def derive_preference_memory(event: AuditEvent) -> Optional[MemoryItem]:
    """Captures user preferences when a preference-change event fires."""
    p = event.payload
    key = p.get("preference_key")
    value = p.get("preference_value")
    if not key:
        return None
    return MemoryItem(
        tenant_id=event.tenant_id,
        project_id=p.get("project_id", ""),
        type=MemoryType.PREFERENCE,
        content=f"Preference '{key}' set to '{value}'",
        source_event_id=event.id,
        source_entity_type=event.entity_type,
        source_entity_id=event.entity_id,
    )


# ---------------------------------------------------------------------------
# Helper — cosine similarity for embedding comparison
# ---------------------------------------------------------------------------

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Return cosine similarity between two vectors."""
    if len(a) != len(b):
        raise ValueError("Vectors must have the same dimensionality")
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)
