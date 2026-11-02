"""JobSearch Automation Engine — FastAPI application package.

The engine is the "brain" of the job-search autopilot platform: portal
connectors + match scoring + apply orchestration. It is stateless (except the
in-memory autopilot flag) and talks to no database — the Next.js app owns the
SQLite DB and calls this engine over HTTP.
"""

__version__ = "1.0.0"
