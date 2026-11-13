"""Optional, read-only source integrations.

No network client is included. A selected public record can be mapped into the
0.2.0 evidence model only after explicit researcher approval.
"""

from .usaspending import apply_mapped_record, map_usaspending_award

__all__ = ["apply_mapped_record", "map_usaspending_award"]
