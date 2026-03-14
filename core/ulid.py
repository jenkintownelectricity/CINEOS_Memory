"""
Minimal ULID generator for CINEOS Memory.

Produces a 26-character Crockford Base32 identifier that is
time-sortable and globally unique — no external dependency needed.
"""

from __future__ import annotations

import os
import time

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def generate_ulid() -> str:
    """Return a new ULID string (26 chars, Crockford Base32)."""
    ts_ms = int(time.time() * 1000)
    rand = int.from_bytes(os.urandom(10), "big")

    chars: list[str] = []
    # 10-char time component (48 bits)
    for _ in range(10):
        chars.append(_CROCKFORD[ts_ms & 0x1F])
        ts_ms >>= 5
    chars.reverse()

    # 16-char randomness component (80 bits)
    rand_chars: list[str] = []
    for _ in range(16):
        rand_chars.append(_CROCKFORD[rand & 0x1F])
        rand >>= 5
    rand_chars.reverse()

    chars.extend(rand_chars)
    return "".join(chars)
