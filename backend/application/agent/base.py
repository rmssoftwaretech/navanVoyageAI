"""BaseAgent ABC for navanVoyageAI agents."""
from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from openai import AsyncAzureOpenAI

from backend.application.agent.registry import get_agent_config

_PROMPTS_JSON = Path(__file__).parent.parent.parent.parent / "config" / "prompts.json"

_DEFAULT_PROMPTS: dict[str, str] = {
    "orchestrator": (
        "You are navanVoyageAI, a corporate travel assistant.\n"
        "Synthesise the sub-agent results below into a single, clear response for the traveller.\n"
        "Be concise. Use markdown for lists and key data. Reference policy verdicts explicitly.\n"
        "If any agent reported an error, acknowledge it and suggest next steps.\n\n"
        "{context_block}\n\nSub-agent results:\n{results_block}"
    ),
    "search": (
        "Extract travel search parameters from the user message and context.\n"
        'Return ONLY valid JSON (no markdown):\n'
        '{\n'
        '  "origin": "IATA code or null",\n'
        '  "destination": "IATA code or null",\n'
        '  "depart_date": "YYYY-MM-DD or null",\n'
        '  "return_date": "YYYY-MM-DD or null",\n'
        '  "cabin_class": "Economy|Economy Plus|Business|First",\n'
        '  "max_price": "number or null",\n'
        '  "adults": 1,\n'
        '  "search_hotels": false,\n'
        '  "city_code": "IATA city code for hotel search or null",\n'
        '  "check_in": "YYYY-MM-DD or null",\n'
        '  "check_out": "YYYY-MM-DD or null",\n'
        '  "max_hotel_rate": "number or null",\n'
        '  "room_type": "Standard Room|Double Bed|Executive Suite or null",\n'
        '  "search_cars": false,\n'
        '  "car_city": "IATA city code for car rental or null",\n'
        '  "car_pickup_date": "YYYY-MM-DD or null",\n'
        '  "car_return_date": "YYYY-MM-DD or null",\n'
        '  "vehicle_class": "Economy|Compact|Mid-size|Full-size|SUV|Luxury|Limousine or null",\n'
        '  "max_daily_rate": "number or null"\n'
        "}\n"
        "Use session context to fill in missing values. Return null for unknown fields.\n"
        "Set search_cars=true if user mentions car rental, car hire, vehicle rental, or limousine.\n"
        "Set search_hotels=true if user mentions hotel, accommodation, or stay.\n"
        "For car_city and city_code use IATA airport codes (e.g. JFK not NYC, LHR not LON).\n"
        "Always use today's year when the user omits a year."
    ),
    "policy": (
        "You are a corporate travel policy expert. Evaluate the proposed trip against company "
        "travel policies and return a structured PolicyVerdict."
    ),
    "destination": (
        "You are a corporate travel information specialist.\n"
        "Given a destination, return ONLY valid JSON (no markdown) with this exact structure:\n"
        '{\n'
        '  "destination": "City, Country",\n'
        '  "entry_requirements": {\n'
        '    "visa": "one sentence on visa requirements for US passport holders",\n'
        '    "passport_validity": "minimum validity required"\n'
        '  },\n'
        '  "currency": {\n'
        '    "code": "ISO currency code",\n'
        '    "approx_rate_usd": 1.0,\n'
        '    "tip": "one practical tip for cash/cards"\n'
        '  },\n'
        '  "climate": {\n'
        '    "season": "current season description",\n'
        '    "temp_c": "typical temperature range",\n'
        '    "advice": "one packing/weather tip"\n'
        '  },\n'
        '  "safety": {\n'
        '    "level": "Low or Medium or High",\n'
        '    "notes": "one sentence safety summary"\n'
        '  },\n'
        '  "local_tips": ["tip 1", "tip 2", "tip 3"]\n'
        "}\n"
        "Be concise. All fields required. Use real, accurate information."
    ),
    "booking": (
        "You are a travel booking specialist. Process flight bookings and generate booking "
        "confirmations with unique NVA-YYYY-NNNNN reference numbers."
    ),
    "judge": (
        "You are an evaluator for a corporate travel AI assistant named navanVoyageAI.\n"
        "Score the AI response below on 5 criteria, each from 0.0 to 1.0.\n"
        "Return ONLY valid JSON (no markdown):\n"
        '{\n'
        '  "relevance": 0.0,\n'
        '  "accuracy": 0.0,\n'
        '  "policy_compliance": 0.0,\n'
        '  "completeness": 0.0,\n'
        '  "tone": 0.0,\n'
        '  "reasoning": "one sentence overall assessment"\n'
        "}\n\n"
        "Criteria:\n"
        "- relevance: Did the response directly address the user's actual request?\n"
        "- accuracy: Are the flight, hotel, or policy facts accurate given the provided context?\n"
        "- policy_compliance: Did the response correctly identify and flag any policy violations?\n"
        "- completeness: Were all aspects of the request covered (flights, hotels, policy, destination)?\n"
        "- tone: Is the response professional, concise, and appropriate for a corporate traveller?"
    ),
}


def get_prompt(agent_name: str) -> str:
    """Return system prompt from config/prompts.json, falling back to hard-coded defaults."""
    try:
        if _PROMPTS_JSON.exists():
            data = json.loads(_PROMPTS_JSON.read_text())
            if agent_name in data and data[agent_name]:
                return str(data[agent_name])
    except Exception:
        pass
    return _DEFAULT_PROMPTS.get(agent_name, f"You are the {agent_name} agent.")


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


def _resolve_model(cfg: dict) -> str:
    """Return the model/deployment name from agent config."""
    return cfg.get("model") or cfg.get("deployment") or os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")


class BaseAgent(ABC):
    name: str = "base"

    def __init__(self) -> None:
        self._cfg = get_agent_config(self.name)
        self._client = _azure_client()

    @property
    def deployment(self) -> str:
        return _resolve_model(self._cfg)

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
        """Call the LLM, routing to the correct provider based on agents.json."""
        provider = self._cfg.get("provider", "azure_openai")
        model = _resolve_model(self._cfg)

        if provider == "anthropic":
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
            msg = await client.messages.create(
                model=model,
                max_tokens=self.max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return msg.content[0].text if msg.content else ""

        if provider == "openai":
            from openai import AsyncOpenAI
            client: Any = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        elif provider == "ollama":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
                api_key="ollama",
            )
        else:
            client = self._client  # azure_openai

        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=self.temperature,
            max_completion_tokens=self.max_tokens,
        )
        return resp.choices[0].message.content or ""
