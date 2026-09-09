import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Installment(Base):
    __tablename__ = "installments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("household_items.id"), unique=True)

    total_installments: Mapped[int] = mapped_column()
    paid_installments: Mapped[int] = mapped_column(default=0)
    payment_day: Mapped[int] = mapped_column()
    start_date: Mapped[date] = mapped_column()
    amount_per_installment: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    notes: Mapped[str | None] = mapped_column(String(1000), default=None)

    item: Mapped["HouseholdItem"] = relationship(back_populates="installment")
