"""Lever connector — simulation-mode listing generation for Lever ATS."""

from __future__ import annotations

from .base import DEFAULT_LIMIT, BaseConnector, generate_listings

COMPANY_POOL: list[str] = [
    "Webflow",
    "Zapier",
    "Loom",
    "Miro",
    "Calendly",
    "1Password",
    "Netlify",
    "Supabase",
    "Prisma",
    "Railway",
    "Render",
    "Fly.io",
    "PlanetScale",
    "Neon",
    "Vercel",
]


class LeverConnector(BaseConnector):
    """Lever ATS connector (search + native ATS application simulation)."""

    platform = "lever"
    display_name = "Lever"
    capabilities = ["search", "ats_apply"]
    easy_apply_rate = 0.25

    def search(
        self,
        keywords: str,
        location: str | None = None,
        limit: int = DEFAULT_LIMIT,
    ) -> list[dict]:
        """Generate simulated Lever listings for the given query."""
        return generate_listings(
            platform=self.platform,
            keywords=keywords,
            location=location,
            limit=limit,
            companies=COMPANY_POOL,
            easy_apply_rate=self.easy_apply_rate,
            extra_titles=["Product Engineer", "Growth Engineer"],
        )
