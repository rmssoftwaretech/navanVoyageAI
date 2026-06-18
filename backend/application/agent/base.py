"""BaseAgent ABC for navanVoyageAI agents."""
from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from openai import AsyncAzureOpenAI

from backend.application.agent.registry import get_agent_config


@dataclass
class AgentContext:
    conversation_id: str
    user: str
    message: str
    session_context: dict = field(default_factory=dict)
    recent_turns: list[dict] = field(default_factory=list)
    db: Any = None


@dataclass
class AgentResult:
    agent: str
    content: str
    success: bool = True
    metadata: dict = field(default_factory=dict)


def _azure_client() -> AsyncAzureOpenAI:
    return AsyncAzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY", ""),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT", "https://placeholder.openai.azure.com/"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    )


class BaseAgent(ABC):
    name: str = "base"

    def __init__(self) -> None:
        self._cfg = get_agent_config(self.name)
        self._client = _azure_client()

    @property
    def deployment(self) -> str:
        return self._cfg.get("deployment", os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"))

    @property
    def temperature(self) -> float:
        return float(self._cfg.get("temperature", 0.3))

    @property
    def max_tokens(self) -> int:
        return int(self._cfg.get("max_tokens", 1024))

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        ...

    async def _chat(self, system: str, user: str) -> str:
        resp = await self._client.chat.completions.create(
            model=self.deployment,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        return resp.choices[0].message.content or ""
