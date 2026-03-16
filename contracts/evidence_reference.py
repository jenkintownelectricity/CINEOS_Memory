"""
CINEOS Memory — Durable Evidence Reference.

Data class for evidence references used by review packets to maintain
links to memory items, traces, commits, media assets, and external sources
across reloads and workspace restores.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
import uuid


class EvidenceType(str, Enum):
    """Types of evidence that can be referenced."""
    MEMORY_ITEM = "memory_item"
    TRACE = "trace"
    COMMIT = "commit"
    MEDIA_ASSET = "media_asset"
    EXTERNAL = "external"


@dataclass
class EvidenceReference:
    """
    Durable reference to a piece of evidence attached to a review packet.

    Evidence references survive workspace restores and session boundaries.
    The source_uri is the canonical locator; metadata carries type-specific
    details that the consuming panel can interpret.
    """

    ref_id: str
    evidence_type: EvidenceType
    source_uri: str
    label: str
    created_at: datetime
    metadata: dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def create(
        evidence_type: EvidenceType,
        source_uri: str,
        label: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> EvidenceReference:
        """Factory method for creating a new evidence reference."""
        return EvidenceReference(
            ref_id=str(uuid.uuid4()),
            evidence_type=evidence_type,
            source_uri=source_uri,
            label=label,
            created_at=datetime.now(timezone.utc),
            metadata=metadata or {},
        )

    # ---- Serialization ----

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dict for persistence."""
        return {
            "ref_id": self.ref_id,
            "evidence_type": self.evidence_type.value,
            "source_uri": self.source_uri,
            "label": self.label,
            "created_at": self.created_at.isoformat(),
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> EvidenceReference:
        """
        Deserialize from a plain dict.

        Fail-closed: raises ValueError on invalid data rather than
        returning a half-constructed reference.
        """
        if not isinstance(data, dict):
            raise ValueError(f"Expected dict, got {type(data).__name__}")

        required_keys = {"ref_id", "evidence_type", "source_uri", "label", "created_at"}
        missing = required_keys - set(data.keys())
        if missing:
            raise ValueError(f"Missing required keys: {missing}")

        try:
            evidence_type = EvidenceType(data["evidence_type"])
        except ValueError:
            raise ValueError(
                f"Invalid evidence_type: {data['evidence_type']}. "
                f"Valid values: {[e.value for e in EvidenceType]}"
            )

        created_at_raw = data["created_at"]
        if isinstance(created_at_raw, str):
            created_at = datetime.fromisoformat(created_at_raw)
        elif isinstance(created_at_raw, datetime):
            created_at = created_at_raw
        else:
            raise ValueError(
                f"Invalid created_at type: {type(created_at_raw).__name__}"
            )

        return cls(
            ref_id=str(data["ref_id"]),
            evidence_type=evidence_type,
            source_uri=str(data["source_uri"]),
            label=str(data["label"]),
            created_at=created_at,
            metadata=dict(data.get("metadata", {})),
        )

    def __repr__(self) -> str:
        return (
            f"EvidenceReference(ref_id={self.ref_id!r}, "
            f"type={self.evidence_type.value!r}, "
            f"uri={self.source_uri!r}, "
            f"label={self.label!r})"
        )
