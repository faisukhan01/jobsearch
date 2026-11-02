"""JobSearch Automation Engine — FastAPI entrypoint.

Endpoints (all under root; the Next.js app calls these over HTTP):

* GET  ``/health``
* GET  ``/connectors``
* GET  ``/connectors/{platform}/capabilities``
* POST ``/sync``
* POST ``/match``
* POST ``/apply``
* POST ``/autopilot/enable`` | ``/autopilot/disable`` | ``/autopilot/tick``
* GET  ``/autopilot/status``

The engine is stateless apart from the in-memory autopilot flag/counters —
no database access and no external network calls.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from . import __version__
from .autopilot import (
    autopilot_status,
    disable_autopilot,
    enable_autopilot,
    execute_application,
    run_tick,
)
from .connectors import CONNECTOR_REGISTRY
from .connectors.base import SIMULATION_MODE
from .matching import score_job

app = FastAPI(title="JobSearch Automation Engine", version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Request models
# --------------------------------------------------------------------------- #

class ProfileModel(BaseModel):
    """User profile subset used for matching/tailoring (extra fields allowed)."""

    model_config = ConfigDict(extra="allow")

    skills: list[str] = Field(default_factory=list)
    location: str | None = None
    desiredSalary: int = 80_000
    experienceYears: float = 0.0


class SyncRequest(BaseModel):
    """POST /sync — pull (simulated) listings from one portal."""

    platform: str
    keywords: str = "Software Engineer"
    location: str | None = "Remote"
    limit: int = 40


class MatchConfigModel(BaseModel):
    """Matching configuration (extra fields allowed)."""

    model_config = ConfigDict(extra="allow")

    remoteOnly: bool = False
    minSalary: int = 0
    locations: list[str] = Field(default_factory=list)


class MatchRequest(BaseModel):
    """POST /match — score a batch of jobs against a profile."""

    profile: ProfileModel = Field(default_factory=ProfileModel)
    config: MatchConfigModel = Field(default_factory=MatchConfigModel)
    jobs: list[dict[str, Any]] = Field(default_factory=list)


class ApplyRequest(BaseModel):
    """POST /apply — run the apply pipeline for a single job."""

    job: dict[str, Any]
    profile: ProfileModel = Field(default_factory=ProfileModel)
    tailor: bool = True
    coverLetter: bool = True


class TickConfigModel(BaseModel):
    """Autopilot tick configuration (extra fields allowed)."""

    model_config = ConfigDict(extra="allow")

    dailyLimit: int = 15
    minMatchScore: int = 70
    appliedToday: int = 0
    autoTailor: bool = True
    autoCoverLetter: bool = True


class TickRequest(BaseModel):
    """POST /autopilot/tick — rank candidates and apply within daily budget."""

    profile: ProfileModel = Field(default_factory=ProfileModel)
    config: TickConfigModel = Field(default_factory=TickConfigModel)
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    alreadyAppliedIds: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# System endpoints
# --------------------------------------------------------------------------- #

@app.get("/", tags=["system"])
def root() -> dict:
    """Service banner / discovery helper."""
    return {
        "engine": "jobsearch-engine",
        "version": __version__,
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/health", tags=["system"])
def health() -> dict:
    """Liveness probe + engine metadata + autopilot snapshot."""
    state = autopilot_status()
    return {
        "status": "ok",
        "engine": "jobsearch-engine",
        "version": __version__,
        "simulation": bool(SIMULATION_MODE),
        "connectors": len(CONNECTOR_REGISTRY),
        "autopilot": {
            "enabled": state["enabled"],
            "appliedToday": state["appliedToday"],
        },
    }


# --------------------------------------------------------------------------- #
# Connector endpoints
# --------------------------------------------------------------------------- #

@app.get("/connectors", tags=["connectors"])
def list_connectors() -> dict:
    """List all registered portal connectors."""
    return {"connectors": [connector.info() for connector in CONNECTOR_REGISTRY.values()]}


@app.get("/connectors/{platform}/capabilities", tags=["connectors"])
def connector_capabilities(platform: str) -> dict:
    """Capabilities descriptor for a single portal connector."""
    connector = CONNECTOR_REGISTRY.get(platform.strip().lower())
    if connector is None:
        raise HTTPException(status_code=404, detail="unknown platform")
    return connector.info()


# --------------------------------------------------------------------------- #
# Sync / match / apply
# --------------------------------------------------------------------------- #

@app.post("/sync", tags=["connectors"])
def sync_jobs(req: SyncRequest) -> dict:
    """Pull (simulated) listings from one portal connector."""
    connector = CONNECTOR_REGISTRY.get(req.platform.strip().lower())
    if connector is None:
        raise HTTPException(status_code=404, detail="unknown platform")
    limit = max(1, min(80, req.limit))
    jobs = connector.search(keywords=req.keywords, location=req.location, limit=limit)
    return {"platform": connector.platform, "count": len(jobs), "jobs": jobs}


@app.post("/match", tags=["matching"])
def match_jobs(req: MatchRequest) -> dict:
    """Score jobs against a profile — results keep the input order."""
    profile = req.profile.model_dump()
    config = req.config.model_dump()
    scored = []
    for job in req.jobs:
        result = score_job(job, profile, config)
        scored.append(
            {
                "externalId": job.get("externalId"),
                "matchScore": result["matchScore"],
                "breakdown": result["breakdown"],
            }
        )
    return {"scored": scored}


@app.post("/apply", tags=["apply"])
def apply_to_job(req: ApplyRequest) -> dict:
    """Run the simulated apply pipeline for a single job."""
    application = execute_application(
        req.job,
        req.profile.model_dump(),
        tailor=req.tailor,
        cover_letter=req.coverLetter,
    )
    return {"ok": True, "application": application}


# --------------------------------------------------------------------------- #
# Autopilot endpoints
# --------------------------------------------------------------------------- #

autopilot_router = APIRouter(prefix="/autopilot", tags=["autopilot"])


@autopilot_router.post("/enable")
def autopilot_enable() -> dict:
    """Enable the autopilot (in-memory flag)."""
    return enable_autopilot()


@autopilot_router.post("/disable")
def autopilot_disable() -> dict:
    """Disable the autopilot (in-memory flag)."""
    return disable_autopilot()


@autopilot_router.get("/status")
def autopilot_status_route() -> dict:
    """Current autopilot state: enabled, appliedToday, lastTickAt."""
    return autopilot_status()


@autopilot_router.post("/tick")
def autopilot_tick(req: TickRequest) -> dict:
    """Rank candidates and run the apply pipeline within daily limits."""
    return run_tick(
        profile=req.profile.model_dump(),
        config=req.config.model_dump(),
        candidates=req.candidates,
        already_applied_ids=req.alreadyAppliedIds,
    )


app.include_router(autopilot_router)
