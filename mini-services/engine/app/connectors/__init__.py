"""Portal connectors for the automation engine.

``CONNECTOR_REGISTRY`` maps platform slugs -> connector singleton instances.
All connectors run in simulation mode (see ``base.SIMULATION_MODE``).
"""

from .base import SIMULATION_MODE, BaseConnector
from .glassdoor import GlassdoorConnector
from .greenhouse import GreenhouseConnector
from .indeed import IndeedConnector
from .lever import LeverConnector
from .linkedin import LinkedInConnector
from .ziprecruiter import ZipRecruiterConnector

CONNECTOR_REGISTRY: dict[str, BaseConnector] = {
    "indeed": IndeedConnector(),
    "linkedin": LinkedInConnector(),
    "glassdoor": GlassdoorConnector(),
    "ziprecruiter": ZipRecruiterConnector(),
    "greenhouse": GreenhouseConnector(),
    "lever": LeverConnector(),
}

__all__ = [
    "CONNECTOR_REGISTRY",
    "SIMULATION_MODE",
    "BaseConnector",
    "IndeedConnector",
    "LinkedInConnector",
    "GlassdoorConnector",
    "ZipRecruiterConnector",
    "GreenhouseConnector",
    "LeverConnector",
]
