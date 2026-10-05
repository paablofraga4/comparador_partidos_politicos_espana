"""Acceso a OpenAI con structured outputs, reintentos y contabilidad de tokens/coste.

Todo lo específico del modelo sale de variables de entorno (plan técnico D9): nunca se fijan
nombres de modelo en el código.
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Protocol

from pydantic import BaseModel


class LLMConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class ModelConfig:
    name: str
    reasoning_effort: str | None = None
    temperature: float | None = None
    # USD por millón de tokens: entrada, entrada en caché, salida
    price_in: float | None = None
    price_cached: float | None = None
    price_out: float | None = None

    @classmethod
    def from_env(cls, role: str) -> ModelConfig:
        """role: ANALYSIS | FAST | CHAT."""
        name = os.environ.get(f"OPENAI_MODEL_{role}")
        if not name:
            raise LLMConfigError(
                f"Falta OPENAI_MODEL_{role} en .env (se fija en la tarea T-107 tras consultar "
                "GET /v1/models)."
            )
        prices = os.environ.get(f"OPENAI_PRICE_{role}")  # "in,cached,out"
        p_in = p_cached = p_out = None
        if prices:
            p_in, p_cached, p_out = (float(x) for x in prices.split(","))
        temp = os.environ.get(f"OPENAI_TEMPERATURE_{role}")
        return cls(
            name=name,
            reasoning_effort=os.environ.get(f"OPENAI_REASONING_{role}") or None,
            temperature=float(temp) if temp else None,
            price_in=p_in,
            price_cached=p_cached,
            price_out=p_out,
        )


@dataclass
class Usage:
    tokens_in: int = 0
    tokens_cached: int = 0
    tokens_out: int = 0
    cost_usd: float = 0.0
    priced: bool = True
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def add(self, cfg: ModelConfig, t_in: int, t_cached: int, t_out: int) -> None:
        with self._lock:
            self.tokens_in += t_in
            self.tokens_cached += t_cached
            self.tokens_out += t_out
            if None in (cfg.price_in, cfg.price_cached, cfg.price_out):
                self.priced = False
                return
            uncached = max(t_in - t_cached, 0)
            self.cost_usd += (
                uncached * cfg.price_in + t_cached * cfg.price_cached + t_out * cfg.price_out
            ) / 1_000_000


class _Client(Protocol):
    responses: Any


def make_client() -> _Client:
    if not os.environ.get("OPENAI_API_KEY"):
        raise LLMConfigError("Falta OPENAI_API_KEY en .env (nunca la pegues en el chat).")
    from openai import OpenAI

    return OpenAI(max_retries=3, timeout=600)


def parse[T: BaseModel](
    client: _Client,
    cfg: ModelConfig,
    usage: Usage,
    *,
    instructions: str,
    input: list[dict[str, str]],
    schema: type[T],
    cache_key: str | None = None,
    max_output_tokens: int = 16_000,
) -> T:
    """Llamada con structured outputs. Reintenta errores transitorios (además de los del SDK)."""
    kwargs: dict[str, Any] = {
        "model": cfg.name,
        "instructions": instructions,
        "input": input,
        "text_format": schema,
        "max_output_tokens": max_output_tokens,
        "store": False,
    }
    if cache_key:
        kwargs["prompt_cache_key"] = cache_key
    if cfg.reasoning_effort:
        kwargs["reasoning"] = {"effort": cfg.reasoning_effort}
    if cfg.temperature is not None:
        kwargs["temperature"] = cfg.temperature

    from openai import APIConnectionError, APITimeoutError, InternalServerError, RateLimitError

    transient = (APIConnectionError, APITimeoutError, InternalServerError, RateLimitError)
    last: Exception | None = None
    for attempt in range(3):
        try:
            resp = client.responses.parse(**kwargs)
        except transient as e:  # el SDK ya reintenta; esto cubre ráfagas largas
            last = e
            time.sleep(10 * (attempt + 1))
            continue
        u = resp.usage
        cached = getattr(getattr(u, "input_tokens_details", None), "cached_tokens", 0) or 0
        usage.add(cfg, u.input_tokens, cached, u.output_tokens)
        if resp.output_parsed is None:
            raise RuntimeError(f"Respuesta sin contenido estructurado (estado: {resp.status})")
        return resp.output_parsed
    raise RuntimeError(f"La llamada al modelo falló tras reintentos: {last}")
