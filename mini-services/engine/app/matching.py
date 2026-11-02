"""Deterministic match-scoring engine.

Scores a job listing against a user profile on five axes:

* **skills**   (0-40) — case-insensitive overlap between the profile's skills
  and the job's tags/description text.
* **location** (0-20) — remote jobs score full marks; otherwise token overlap
  between the job location and the profile/config locations; else minimal.
* **salary**   (0-15) — job ``salaryMax`` vs. the profile's ``desiredSalary``.
* **recency**  (0-15) — how recently the job was posted.
* **bonus**    (0-10) — Easy Apply jobs get a friction bonus.

The total is capped at 100. Pure functions only — no I/O, no state.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

SKILLS_MAX = 40
LOCATION_MAX = 20
SALARY_MAX = 15
RECENCY_MAX = 15
BONUS_MAX = 10
TOTAL_MAX = 100

_DEFAULT_DESIRED_SALARY = 80_000


def _tokens(text: str) -> set[str]:
    """Lowercase alphanumeric tokens of *text* (keeps ``#``/``+`` for c#/c++)."""
    return {t for t in re.split(r"[^a-z0-9+#]+", (text or "").lower()) if t}


def _parse_ts(value: object) -> datetime | None:
    """Parse an ISO-8601 timestamp (accepts trailing ``Z``); None if invalid."""
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def score_job(job: dict, profile: dict, config: dict | None = None) -> dict:
    """Score one job against a profile.

    Returns ``{"matchScore": int, "breakdown": {"skills", "location",
    "salary", "recency", "bonus"}}``.
    """
    config = config or {}
    profile = profile or {}

    # --- Skills (0-40) -----------------------------------------------------
    skills = [str(s) for s in (profile.get("skills") or []) if str(s).strip()]
    tag_set = {str(t).lower() for t in (job.get("tags") or [])}
    description = str(job.get("description") or "").lower()
    matched: list[str] = []
    for skill in skills:
        s = skill.lower()
        if s in tag_set or s in description:
            matched.append(skill)
    skills_pts = int(round(len(matched) / len(skills) * SKILLS_MAX)) if skills else 0

    # --- Location (0-20) ---------------------------------------------------
    if job.get("remote"):
        location_pts = 20
    else:
        job_tokens = _tokens(str(job.get("location") or ""))
        refs = [str(profile.get("location") or "")]
        refs += [str(x) for x in (config.get("locations") or [])]
        if config.get("location"):
            refs.append(str(config["location"]))
        overlap = any(job_tokens & _tokens(ref) for ref in refs if ref.strip())
        location_pts = 10 if overlap else 4

    # --- Salary (0-15) -----------------------------------------------------
    desired = int(profile.get("desiredSalary") or _DEFAULT_DESIRED_SALARY)
    salary_max = int(job.get("salaryMax") or 0)
    if salary_max >= desired:
        salary_pts = 15
    elif salary_max >= desired * 0.9:
        salary_pts = 9
    else:
        salary_pts = 3

    # --- Recency (0-15) ----------------------------------------------------
    posted = _parse_ts(job.get("postedAt"))
    if posted is None:
        recency_pts = 4
    else:
        hours = (datetime.now(timezone.utc) - posted).total_seconds() / 3600
        if hours <= 72:
            recency_pts = 15
        elif hours <= 168:
            recency_pts = 11
        elif hours <= 336:
            recency_pts = 7
        else:
            recency_pts = 4

    # --- Bonus (0-10) ------------------------------------------------------
    bonus_pts = 10 if job.get("easyApply") else 5

    total = min(TOTAL_MAX, skills_pts + location_pts + salary_pts + recency_pts + bonus_pts)
    return {
        "matchScore": int(total),
        "breakdown": {
            "skills": skills_pts,
            "location": location_pts,
            "salary": salary_pts,
            "recency": recency_pts,
            "bonus": bonus_pts,
        },
    }


def rank_jobs(jobs: list[dict], profile: dict, config: dict | None = None) -> list[dict]:
    """Score every job, attach ``matchScore``/``breakdown``, sort descending.

    Sort is stable — jobs with equal scores keep their input order.
    """
    ranked: list[dict] = []
    for job in jobs:
        result = score_job(job, profile, config)
        enriched = dict(job)
        enriched["matchScore"] = result["matchScore"]
        enriched["breakdown"] = result["breakdown"]
        ranked.append(enriched)
    ranked.sort(key=lambda j: j["matchScore"], reverse=True)
    return ranked
