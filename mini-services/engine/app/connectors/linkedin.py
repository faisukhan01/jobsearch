"""LinkedIn connector — simulation-mode listing generation for LinkedIn."""

from __future__ import annotations

from .base import DEFAULT_LIMIT, BaseConnector, generate_listings

COMPANY_POOL: list[str] = [
    "Microsoft",
    "Google",
    "Amazon",
    "Meta",
    "Netflix",
    "Adobe",
    "Salesforce",
    "NVIDIA",
    "Atlassian",
    "Spotify",
    "Twilio",
    "Snowflake",
    "Okta",
    "Zoom",
    "Shopify",
]


class LinkedInConnector(BaseConnector):
    """LinkedIn jobs connector (search only — Easy Apply is rate-limited/ToS-heavy)."""

    platform = "linkedin"
    display_name = "LinkedIn"
    capabilities = ["search"]
    easy_apply_rate = 0.4

    def search(
        self,
        keywords: str,
        location: str | None = None,
        limit: int = DEFAULT_LIMIT,
    ) -> list[dict]:
        """Generate simulated LinkedIn listings for the given query."""
        return generate_listings(
            platform=self.platform,
            keywords=keywords,
            location=location,
            limit=limit,
            companies=COMPANY_POOL,
            easy_apply_rate=self.easy_apply_rate,
            extra_titles=["Software Engineer, Infrastructure", "Software Engineer, Payments"],
        )
