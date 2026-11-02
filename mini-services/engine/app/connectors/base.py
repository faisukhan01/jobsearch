"""Connector base class and the shared simulated job-listing generator.

SIMULATION_MODE
===============
``SIMULATION_MODE = True`` is the default operating mode of every connector
in this engine.

* **Production mode** (``SIMULATION_MODE = False``): ``BaseConnector.search()``
  would delegate to a Playwright browser-automation worker — the documented
  hook is ``production_worker.search()`` — which drives a real, authenticated
  browser session against the target portal (Indeed, LinkedIn, Glassdoor,
  ZipRecruiter, Greenhouse, Lever) and scrapes live listings. That worker is
  intentionally out of scope for this service.

* **Simulation mode** (this repo): connectors never touch the network. They
  generate realistic listings via :func:`generate_listings`, using per-platform
  company/title pools, plausible salaries, tags and recency, so downstream
  consumers (the Next.js client) get payloads with a production-identical
  shape while the engine stays fully self-contained and offline-safe.
"""

from __future__ import annotations

import random
import re
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

# See module docstring. Flip to False only when a production_worker is wired.
SIMULATION_MODE = True

# Max listings a single search may return, per contract.
MAX_LIMIT = 80
DEFAULT_LIMIT = 40

GENERAL_TITLES: list[str] = [
    "Senior Backend Engineer",
    "Full Stack Developer",
    "Platform Engineer",
    "DevOps Engineer",
    "Staff Software Engineer",
    "Machine Learning Engineer",
    "Frontend Engineer",
    "Site Reliability Engineer",
    "Software Engineer",
    "Backend Engineer",
    "Data Engineer",
    "Senior Full Stack Engineer",
]

LOCATION_POOL: list[str] = [
    "Remote",
    "Remote — US",
    "New York, NY",
    "San Francisco, CA",
    "Austin, TX",
    "London, UK",
    "Berlin, DE",
    "Toronto, CA",
]

SKILL_POOL: list[str] = [
    "Python",
    "TypeScript",
    "React",
    "Go",
    "Java",
    "SQL",
    "PostgreSQL",
    "Kubernetes",
    "Docker",
    "AWS",
    "Terraform",
    "GraphQL",
    "Redis",
    "Kafka",
    "Next.js",
    "Rust",
    "CI/CD",
    "System Design",
]

# Canonical display forms for skills that may appear in search keywords.
_CANONICAL_SKILLS: dict[str, str] = {
    "python": "Python",
    "sql": "SQL",
    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "react": "React",
    "go": "Go",
    "golang": "Go",
    "rust": "Rust",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "docker": "Docker",
    "aws": "AWS",
    "azure": "Azure",
    "gcp": "GCP",
    "devops": "DevOps",
    "backend": "Backend",
    "frontend": "Frontend",
    "graphql": "GraphQL",
    "terraform": "Terraform",
    "node": "Node.js",
    "nodejs": "Node.js",
    "ruby": "Ruby",
    "php": "PHP",
    "ios": "iOS",
    "android": "Android",
    "sre": "SRE",
    "data": "Data",
    "ml": "ML",
}

_BIGRAM_SKILLS: dict[str, str] = {
    "machine learning": "Machine Learning",
    "full stack": "Full Stack",
    "data engineering": "Data Engineering",
    "site reliability": "Site Reliability",
}


class BaseConnector(ABC):
    """Abstract portal connector.

    Subclasses declare their identity/metadata (``platform``, ``display_name``,
    ``capabilities``) and implement :meth:`search`. In simulation mode
    ``search`` generates deterministic-shape listings; in production it would
    delegate to the ``production_worker.search()`` Playwright hook (see module
    docstring).
    """

    platform: str = "base"
    display_name: str = "Base"
    capabilities: list[str] = ["search"]
    # Probability (0-1) that a generated listing supports Easy Apply.
    easy_apply_rate: float = 0.25

    def info(self) -> dict:
        """Return the public descriptor used by GET /connectors."""
        return {
            "platform": self.platform,
            "name": self.display_name,
            "capabilities": list(self.capabilities),
            "mode": "simulation" if SIMULATION_MODE else "production",
        }

    @abstractmethod
    def search(
        self,
        keywords: str,
        location: str | None = None,
        limit: int = DEFAULT_LIMIT,
    ) -> list[dict]:
        """Search the portal for job listings.

        Returns a list of job dicts (shape documented in
        :func:`generate_listings`).
        """
        raise NotImplementedError


def _tags_for(keywords: str) -> list[str]:
    """Build 3-5 skill tags: keyword-derived first, then pool fillers."""
    kw = (keywords or "").lower()
    tags: list[str] = []

    for bigram, canon in _BIGRAM_SKILLS.items():
        if bigram in kw and canon not in tags:
            tags.append(canon)

    for token in re.split(r"[^a-z0-9+#]+", kw):
        canon = _CANONICAL_SKILLS.get(token)
        if canon and canon not in tags:
            tags.append(canon)

    target = random.randint(3, 5)
    pool = [s for s in SKILL_POOL if s not in tags]
    tags.extend(random.sample(pool, min(max(0, target - len(tags)), len(pool))))
    return tags[:5]


def _salary_band_for(title: str) -> tuple[int, int]:
    """Realistic annual USD band per seniority signals in the title."""
    t = title.lower()
    if "staff" in t or "principal" in t:
        return (180_000, 260_000)
    if "senior" in t or "lead" in t or "manager" in t:
        return (140_000, 200_000)
    if "intern" in t:
        return (70_000, 95_000)
    if "junior" in t or "entry" in t:
        return (70_000, 110_000)
    if "machine learning" in t:
        return (150_000, 220_000)
    return (100_000, 165_000)


def _salary_range(title: str) -> tuple[int, int]:
    """Concrete (salaryMin, salaryMax) inside the seniority band, $5k steps."""
    lo, hi = _salary_band_for(title)
    mid = lo + (hi - lo) // 3
    salary_min = random.randrange(lo, mid + 1, 5_000)
    salary_max = min(hi, salary_min + random.randrange(15_000, 70_000, 5_000))
    if salary_max <= salary_min:
        salary_max = min(260_000, salary_min + 15_000)
    return int(salary_min), int(salary_max)


def _description_for(company: str, title: str, keywords: str, tags: list[str]) -> str:
    """2-3 sentence realistic description that mentions the keywords/skills."""
    focus = (keywords or "").strip() or "modern web platforms"
    skills = ", ".join(tags[:3])
    team = random.choice(
        ["platform", "product engineering", "infrastructure", "core services", "growth", "data platform"]
    )
    templates = [
        (
            f"{company} is hiring a {title} to join its {team} team. "
            f"You will own projects focused on {focus}, partnering closely with product and design "
            f"to ship features used by millions. Our stack includes {skills} on top of modern cloud tooling."
        ),
        (
            f"We're looking for a {title} at {company} to help scale the platform through its next stage of growth. "
            f"The role centers on {focus}, with end-to-end ownership of services handling significant daily traffic. "
            f"You'll work daily with {skills} alongside a senior, low-ego team."
        ),
        (
            f"{company}'s {team} team is growing and we need a {title} to raise the bar. "
            f"Day to day you'll design, build, and operate systems for {focus}, and help set engineering "
            f"standards across the org. Strong experience with {skills} is a plus."
        ),
    ]
    return random.choice(templates)


def generate_listings(
    platform: str,
    keywords: str,
    location: str | None,
    limit: int,
    companies: list[str],
    easy_apply_rate: float,
    extra_titles: list[str] | None = None,
) -> list[dict]:
    """Generate ``limit`` realistic simulated job listings for a platform.

    Each job dict has the contract shape::

        {
            "externalId": "{platform}-{uuid4hex[:12]}",
            "platform": str, "title": str, "company": str, "location": str,
            "remote": bool, "employmentType": "FULL_TIME"|"CONTRACT"|"PART_TIME",
            "salaryMin": int, "salaryMax": int, "currency": "USD",
            "description": str, "tags": [str, ...], "easyApply": bool,
            "postedAt": "ISO-8601 within last 21 days", "matchScore": 0,
        }
    """
    limit = max(1, min(MAX_LIMIT, int(limit or DEFAULT_LIMIT)))
    keywords = (keywords or "").strip()
    location = (location or "").strip() or "Remote"

    titles = list(GENERAL_TITLES) + list(extra_titles or [])
    if keywords:
        titles = [keywords, f"Senior {keywords}", f"Lead {keywords}", f"Staff {keywords}"] + titles

    jobs: list[dict] = []
    for _ in range(limit):
        title = random.choice(titles)
        company = random.choice(companies)

        # Weight the requested location heavily; otherwise draw from the pool.
        job_location = location if random.random() < 0.55 else random.choice(LOCATION_POOL)
        remote = "remote" in job_location.lower()

        employment_type = random.choices(
            ["FULL_TIME", "CONTRACT", "PART_TIME"], weights=[0.80, 0.15, 0.05]
        )[0]
        salary_min, salary_max = _salary_range(title)
        tags = _tags_for(keywords)
        posted_at = (
            datetime.now(timezone.utc) - timedelta(hours=random.uniform(0.5, 21 * 24))
        ).replace(microsecond=0).isoformat().replace("+00:00", "Z")

        jobs.append(
            {
                "externalId": f"{platform}-{uuid.uuid4().hex[:12]}",
                "platform": platform,
                "title": title,
                "company": company,
                "location": job_location,
                "remote": remote,
                "employmentType": employment_type,
                "salaryMin": salary_min,
                "salaryMax": salary_max,
                "currency": "USD",
                "description": _description_for(company, title, keywords, tags),
                "tags": tags,
                "easyApply": random.random() < easy_apply_rate,
                "postedAt": posted_at,
                "matchScore": 0,
            }
        )
    return jobs
