"""Glassdoor connector — simulation-mode listing generation for Glassdoor."""

from __future__ import annotations

from .base import DEFAULT_LIMIT, BaseConnector, generate_listings

COMPANY_POOL: list[str] = [
    "Lyft",
    "Pinterest",
    "Reddit",
    "Robinhood",
    "Coinbase",
    "Chime",
    "Brex",
    "Gusto",
    "Asana",
    "Dropbox",
    "Squarespace",
    "Braze",
    "Amplitude",
    "Intercom",
    "Loom",
]


class GlassdoorConnector(BaseConnector):
    """Glassdoor jobs connector (search only)."""

    platform = "glassdoor"
    display_name = "Glassdoor"
    capabilities = ["search"]
    easy_apply_rate = 0.25

    def search(
        self,
        keywords: str,
        location: str | None = None,
        limit: int = DEFAULT_LIMIT,
    ) -> list[dict]:
        """Generate simulated Glassdoor listings for the given query."""
        return generate_listings(
            platform=self.platform,
            keywords=keywords,
            location=location,
            limit=limit,
            companies=COMPANY_POOL,
            easy_apply_rate=self.easy_apply_rate,
        )
