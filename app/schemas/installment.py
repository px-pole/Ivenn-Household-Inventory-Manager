import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class InstallmentBase(BaseModel):
    total_installments: int = Field(ge=1)
    payment_day: int = Field(ge=1, le=31)
    start_date: date
    amount_per_installment: Decimal | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=1000)


class InstallmentCreate(InstallmentBase):
    paid_installments: int = Field(default=0, ge=0)


class InstallmentUpdate(BaseModel):
    total_installments: int | None = Field(default=None, ge=1)
    paid_installments: int | None = Field(default=None, ge=0)
    payment_day: int | None = Field(default=None, ge=1, le=31)
    start_date: date | None = None
    amount_per_installment: Decimal | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=1000)


class InstallmentRead(InstallmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    item_id: uuid.UUID
    paid_installments: int
    remaining_installments: int
    last_payment_date: date


class InstallmentOverviewRead(InstallmentRead):
    item_name: str
    item_status: str
