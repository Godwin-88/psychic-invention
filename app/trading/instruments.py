"""Tradable instruments: cash equities/ETFs and European-style listed options."""

from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class OptionSpec(BaseModel):
    underlying: str = Field(..., min_length=1, max_length=32)
    strike: float = Field(..., gt=0)
    expiry: date
    right: Literal["call", "put"]


class Instrument(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=64)
    asset_class: Literal["equity", "option"] = "equity"
    multiplier: float = Field(1.0, gt=0)
    option: Optional[OptionSpec] = None
    sector: Optional[str] = None

    @model_validator(mode="after")
    def _check(self) -> "Instrument":
        if self.asset_class == "option":
            if self.option is None:
                raise ValueError("option instruments need an option spec")
            if self.multiplier == 1.0:
                self.multiplier = 100.0  # standard US equity option contract
        elif self.option is not None:
            raise ValueError("only option instruments carry an option spec")
        return self

    @property
    def underlying(self) -> str:
        return self.option.underlying if self.option else self.symbol

    def years_to_expiry(self, today: Optional[date] = None) -> float:
        if not self.option:
            return 0.0
        today = today or date.today()
        return max((self.option.expiry - today).days, 0) / 365.0


def equity(symbol: str, sector: Optional[str] = None) -> Instrument:
    return Instrument(symbol=symbol, asset_class="equity", sector=sector)
