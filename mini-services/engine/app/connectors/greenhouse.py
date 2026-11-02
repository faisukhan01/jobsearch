"""Greenhouse connector — simulation-mode listing generation for Greenhouse ATS."""

from __future__ import annotations

from .base import DEFAULT_LIMIT, BaseConnector, generate_listings

COMPANY_POOL: list[str] = [
    "Databricks",
    "Anthropic",
    "Scale AI",
    "Canva",
    "Fivetran",
    "dbt Labs",
    "Airtable",
    "Retool",
    "Sourcegraph",
    "Grafana Labs",
    "Cockroach Labs",
    "Stripe",
    "Figma",
    "Notion",
    "Linear",
]


class GreenhouseConnector(BaseConnector):
    """Greenhouse ATS connector (search + native ATS application simulation)."""

    platform = "greenhouse"
    display_name = "Greenhouse"
    capabilities = ["search", "ats_apply"]
    easy_apply_rate = 0.25

    def search(
        self,
        keywords: str,
        location: str | None = None,
        limit: int = DEFAULT_LIMIT,
    ) -> list[dict]:
        """Generate simulated Greenhouse listings for the given query."""
        return generate_listings(
            platform=self.platform,
            keywords=keywords,
            location=location,
            limit=limit,
            companies=COMPANY_POOL,
            easy_apply_rate=self.easy_apply_rate,
            extra_titles=["Applied AI Engineer", "Research Engineer"],
        )
