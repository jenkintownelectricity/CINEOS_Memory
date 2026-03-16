"""
CINEOS Memory — Timeline Mutation Linkage Contract.

Links timeline mutations to memory reasoning items, enabling the memory
system to track which editorial decisions produced which timeline changes.
This supports the Wave 3 requirement for timeline → memory linkage.

Classification: SCAFFOLD — linkage contract defined, wiring foundational.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
import uuid


@dataclass
class TimelineMutationMemoryLink:
    """Links a timeline mutation to a memory reasoning item.

    This enables tracing which editorial reasoning (stored in memory)
    led to which timeline edit operations.
    """

    link_id: str
    mutation_id: str
    timeline_id: str
    memory_item_id: str
    operation_type: str  # insert | trim | split | move | replace | remove
    reasoning_summary: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def create(
        mutation_id: str,
        timeline_id: str,
        memory_item_id: str,
        operation_type: str,
        reasoning_summary: str = "",
        metadata: Optional[dict[str, Any]] = None,
    ) -> TimelineMutationMemoryLink:
        """Factory method for creating a new linkage."""
        return TimelineMutationMemoryLink(
            link_id=str(uuid.uuid4()),
            mutation_id=mutation_id,
            timeline_id=timeline_id,
            memory_item_id=memory_item_id,
            operation_type=operation_type,
            reasoning_summary=reasoning_summary,
            metadata=metadata or {},
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "link_id": self.link_id,
            "mutation_id": self.mutation_id,
            "timeline_id": self.timeline_id,
            "memory_item_id": self.memory_item_id,
            "operation_type": self.operation_type,
            "reasoning_summary": self.reasoning_summary,
            "created_at": self.created_at.isoformat(),
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> TimelineMutationMemoryLink:
        if not isinstance(data, dict):
            raise ValueError(f"Expected dict, got {type(data).__name__}")
        required = {"link_id", "mutation_id", "timeline_id", "memory_item_id", "operation_type"}
        missing = required - set(data.keys())
        if missing:
            raise ValueError(f"Missing required keys: {missing}")
        created_at_raw = data.get("created_at")
        if isinstance(created_at_raw, str):
            created_at = datetime.fromisoformat(created_at_raw)
        elif isinstance(created_at_raw, datetime):
            created_at = created_at_raw
        else:
            created_at = datetime.now(timezone.utc)
        return cls(
            link_id=str(data["link_id"]),
            mutation_id=str(data["mutation_id"]),
            timeline_id=str(data["timeline_id"]),
            memory_item_id=str(data["memory_item_id"]),
            operation_type=str(data["operation_type"]),
            reasoning_summary=str(data.get("reasoning_summary", "")),
            created_at=created_at,
            metadata=dict(data.get("metadata", {})),
        )

    def __repr__(self) -> str:
        return (
            f"TimelineMutationMemoryLink(link_id={self.link_id!r}, "
            f"mutation={self.mutation_id!r}, "
            f"memory={self.memory_item_id!r})"
        )
