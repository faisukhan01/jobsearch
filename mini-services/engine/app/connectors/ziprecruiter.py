"""ZipRecruiter connector — simulation-mode listing generation for ZipRecruiter."""

from __future__ import annotations

from .base import DEFAULT_LIMIT, BaseConnector, generate_listings

COMPANY_POOL: list[str] = [
    "Toast",
    "Samsara",
    "Snyk",
    "GitLab",
    "HashiCorp",
    "Confluent",
    "Elastic",
    "MongoDB",
    "PagerDuty",
    "New Relic",
    "Fastly",
    "Auth0",
    "Kong",
    "Sumo Logic",
    "Datadog",
]


class ZipRecruiterConnector(BaseConnector):
    """ZipRecruiter connector (search + 1-click Easy Apply simulation)."""

    platform = "ziprecruiter"
    display_name = "ZipRecruiter"
    capabilities = ["search", "easy_apply"]
    easy_apply_rate = 0.7

    def search(
        self,
        keywords: str,
        location: str | None = None,
        limit: int = DEFAULT_LIMIT,
    ) -> list[dict]:
        """Generate simulated ZipRecruiter listings for the given query."""
        return generate_listings(
            platform=self.platform,
            keywords=keywords,
            location=location,
            limit=limit,
            companies=COMPANY_POOL,
            easy_apply_rate=self.easy_apply_rate,
        )
