"""Indeed connector — simulation-mode listing generation for Indeed."""

from __future__ import annotations

from .base import DEFAULT_LIMIT, BaseConnector, generate_listings

COMPANY_POOL: list[str] = [
    "Stripe",
    "Shopify",
    "Datadog",
    "Figma",
    "Airbnb",
    "Uber",
    "Notion",
    "Ramp",
    "Linear",
    "Vercel",
    "Cloudflare",
    "Plaid",
    "Faire",
    "Duolingo",
    "Peloton",
]


class IndeedConnector(BaseConnector):
    """Indeed job-board connector (search + Easy Apply simulation)."""

    platform = "indeed"
    display_name = "Indeed"
    capabilities = ["search", "easy_apply"]
    easy_apply_rate = 0.7

    def search(
        self,
        keywords: str,
        location: str | None = None,
        limit: int = DEFAULT_LIMIT,
    ) -> list[dict]:
        """Generate simulated Indeed listings for the given query."""
        return generate_listings(
            platform=self.platform,
            keywords=keywords,
            location=location,
            limit=limit,
            companies=COMPANY_POOL,
            easy_apply_rate=self.easy_apply_rate,
        )
