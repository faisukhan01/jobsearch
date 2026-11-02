"""Autopilot orchestration for the automation engine.

Owns three things:

1. **In-memory autopilot state** (enabled flag, appliedToday counter,
   lastTickAt) — the engine is otherwise stateless; the Next.js app remains
   the source of truth and mirrors these values into its own DB.
2. **The apply pipeline** (:func:`execute_application`) — the simulated
   sequence of steps (session auth → parse → tailor → cover letter → fill
   form → submit → confirm) shared by ``POST /apply`` and the autopilot tick.
   Each step sleeps a few ms purely to mimic real work (<0.5s total).
3. **Tick orchestration** (:func:`run_tick`) — rank candidates, enforce
   already-applied / minimum-score / daily-budget rules, and apply to the
   best jobs (max 5 per tick).
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

from .matching import score_job

MAX_PER_TICK = 5
DEFAULT_DAILY_LIMIT = 15
DEFAULT_MIN_MATCH_SCORE = 70

# In-memory state (module-level singleton). No DB by design.
_STATE: dict = {
    "enabled": False,
    "appliedToday": 0,
    "lastTickAt": None,
}


def _now_iso() -> str:
    """Current UTC time as a compact ISO-8601 string."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# --------------------------------------------------------------------------- #
# Autopilot state
# --------------------------------------------------------------------------- #

def enable_autopilot() -> dict:
    """Enable the autopilot (in-memory flag)."""
    _STATE["enabled"] = True
    return {"enabled": True}


def disable_autopilot() -> dict:
    """Disable the autopilot (in-memory flag)."""
    _STATE["enabled"] = False
    return {"enabled": False}


def autopilot_status() -> dict:
    """Current autopilot snapshot: enabled, appliedToday, lastTickAt."""
    return {
        "enabled": _STATE["enabled"],
        "appliedToday": _STATE["appliedToday"],
        "lastTickAt": _STATE["lastTickAt"],
    }


# --------------------------------------------------------------------------- #
# Tailoring / cover letter templates (no external AI calls)
# --------------------------------------------------------------------------- #

def _top_skills(job: dict, profile: dict) -> list[str]:
    """Best 3 skills to emphasize: profile∩job tags, else profile, else job tags."""
    profile_skills = [str(s) for s in (profile.get("skills") or []) if str(s).strip()]
    job_tags = [str(t) for t in (job.get("tags") or [])]
    tag_lower = {t.lower() for t in job_tags}
    overlap = [s for s in profile_skills if s.lower() in tag_lower]
    if overlap:
        return overlap[:3]
    if profile_skills:
        return profile_skills[:3]
    if job_tags:
        return job_tags[:3]
    return ["distributed systems"]


def _tailored_resume(job: dict, profile: dict) -> str:
    """1-2 sentence summary of tailored resume highlights."""
    focus = ", ".join(_top_skills(job, profile))
    years = profile.get("experienceYears") or 4
    title = job.get("title") or "role"
    company = job.get("company") or "the company"
    return (
        f"Leads with {focus} and {years}+ years of hands-on delivery, tuned to the "
        f"{title} opening at {company}. "
        f"Bullets were reordered around quantified impact and mirror the posting's key responsibilities."
    )


def _cover_letter(job: dict, profile: dict) -> str:
    """Template-generated 3-4 sentence cover letter (no external AI call)."""
    company = job.get("company") or "your team"
    title = job.get("title") or "this role"
    years = profile.get("experienceYears") or 4
    skills = ", ".join(_top_skills(job, profile)) or "the core stack in your posting"
    return (
        f"Dear {company} Hiring Team, I'm excited to apply for the {title} role. "
        f"Over the past {years} years I've shipped production systems with {skills}, "
        f"and your posting maps almost one-to-one with the problems I most enjoy solving. "
        f"At {company} I'd aim to ramp quickly, earn trust with small wins, and help the team ship faster. "
        f"Thank you for your time — I'd welcome a conversation about how I can contribute."
    )


# --------------------------------------------------------------------------- #
# Apply pipeline (shared by POST /apply and POST /autopilot/tick)
# --------------------------------------------------------------------------- #

def execute_application(
    job: dict,
    profile: dict,
    tailor: bool = True,
    cover_letter: bool = True,
    match_score: int | None = None,
) -> dict:
    """Run the simulated apply pipeline for a single job.

    Returns the ``application`` object whose shape is contract-shared by
    ``POST /apply`` and ``POST /autopilot/tick``. Steps sleep a few ms each
    (<0.5s total) purely to mimic real browser-automation work.
    """
    platform = str(job.get("platform") or "unknown")
    external_id = str(job.get("externalId") or "unknown")
    title = str(job.get("title") or "untitled role")
    company = str(job.get("company") or "the company")

    if match_score is None:
        match_score = int(job.get("matchScore") or 0)
    if not match_score:
        match_score = score_job(job, profile, {})["matchScore"]

    steps: list[dict] = []

    def _step(name: str, detail: str, ms: int, sleep_s: float) -> None:
        if sleep_s:
            time.sleep(sleep_s)
        steps.append({"step": name, "detail": detail, "ms": ms})

    _step("session_auth", f"Verified platform session for {platform}", 120, 0.02)
    _step("parse_job", f"Parsed job {external_id} · {title}", 85, 0.02)

    if tailor:
        tailored_resume = _tailored_resume(job, profile)
        _step("tailor_resume", f"Tailored resume highlights for {title} at {company}", 210, 0.05)
    else:
        tailored_resume = "Base resume used as-is (tailoring disabled)."
        _step("tailor_resume", "Skipped tailoring · used base resume", 15, 0.0)

    if cover_letter:
        cover_letter_text = _cover_letter(job, profile)
        _step("cover_letter", f"Generated cover letter · {len(cover_letter_text)} chars", 160, 0.03)
    else:
        cover_letter_text = ""
        _step("cover_letter", "Skipped cover letter", 10, 0.0)

    field_count = 6 + len(job.get("tags") or [])
    _step("fill_form", f"Filled application form · {field_count} fields", 240, 0.05)
    _step(
        "submit",
        f"Submitted via {platform} {'Easy Apply' if job.get('easyApply') else 'standard application form'}",
        180,
        0.04,
    )
    _step("confirm", f"Application confirmed · ref {external_id}", 90, 0.02)

    return {
        "status": "applied",
        "method": "autopilot",
        "matchScore": int(match_score),
        "appliedAt": _now_iso(),
        "tailoredResume": tailored_resume,
        "coverLetter": cover_letter_text,
        "steps": steps,
    }


# --------------------------------------------------------------------------- #
# Tick orchestration
# --------------------------------------------------------------------------- #

def run_tick(
    profile: dict,
    config: dict | None,
    candidates: list[dict],
    already_applied_ids: list[str] | None = None,
) -> dict:
    """One autopilot tick: rank → filter → apply (max 5 per tick).

    Skips candidates that were already applied to, score below
    ``config.minMatchScore``, or beyond the remaining daily budget
    (``config.dailyLimit - config.appliedToday``).
    """
    config = config or {}
    daily_limit = int(config.get("dailyLimit", DEFAULT_DAILY_LIMIT))
    min_match_score = int(config.get("minMatchScore", DEFAULT_MIN_MATCH_SCORE))
    applied_today = int(config.get("appliedToday", 0))
    auto_tailor = bool(config.get("autoTailor", True))
    auto_cover_letter = bool(config.get("autoCoverLetter", True))
    already_applied = {str(x) for x in (already_applied_ids or [])}

    remaining = max(0, daily_limit - applied_today)
    cap = min(remaining, MAX_PER_TICK)

    # Trust the persisted matchScore computed by this same engine at sync
    # time (Next.js is the source of truth); only re-score when a candidate
    # arrives without one. Rank highest-first.
    for job in candidates or []:
        if not int(job.get("matchScore") or 0):
            job["matchScore"] = score_job(job, profile, config)["matchScore"]
    ranked = sorted(candidates or [], key=lambda j: int(j.get("matchScore") or 0), reverse=True)

    applied: list[dict] = []
    skipped = {"belowScore": 0, "alreadyApplied": 0, "dailyLimit": 0}
    events: list[dict] = []

    for job in ranked:
        external_id = str(job.get("externalId"))
        if external_id in already_applied:
            skipped["alreadyApplied"] += 1
            continue
        if int(job.get("matchScore") or 0) < min_match_score:
            skipped["belowScore"] += 1
            continue
        if len(applied) >= cap:
            skipped["dailyLimit"] += 1
            continue

        result = execute_application(
            job,
            profile,
            tailor=auto_tailor,
            cover_letter=auto_cover_letter,
            match_score=int(job["matchScore"]),
        )
        applied.append({"job": job, "application": result})
        events.append(
            {
                "type": "apply",
                "platform": job.get("platform"),
                "message": (
                    f"Applied to {job.get('title')} at {job.get('company')} "
                    f"· {job['matchScore']}% match"
                ),
                "meta": {"externalId": external_id, "matchScore": job["matchScore"]},
                "ts": _now_iso(),
            }
        )

    _STATE["appliedToday"] += len(applied)
    _STATE["lastTickAt"] = _now_iso()

    return {
        "applied": applied,
        "skipped": skipped,
        "dailyLimitReached": bool(remaining <= 0 or len(applied) >= remaining),
        "events": events,
    }
