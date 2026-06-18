"""Agent configuration registry — loads config/agents.json; hot-reloadable."""
from __future__ import annotations

import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

_CONFIG_PATH = Path(__file__).parent.parent.parent.parent / "config" / "agents.json"
_config: dict = {}


def load_config() -> None:
    global _config
    try:
        _config = json.loads(_CONFIG_PATH.read_text())
        log.info("Loaded agent config from %s", _CONFIG_PATH)
    except Exception as exc:
        log.warning("Could not load agents.json: %s", exc)
        _config = {}


def get_agent_config(name: str) -> dict:
    if not _config:
        load_config()
    return _config.get(name, {})


def reload_agent_config() -> dict:
    load_config()
    return _config


def get_full_config() -> dict:
    if not _config:
        load_config()
    return dict(_config)


# Load on import
load_config()
