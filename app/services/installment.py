import calendar
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import HouseholdItem, Installment
from app.schemas.installment import InstallmentCreate, InstallmentUpdate


class ItemNotFoundError(Exception):
    """Raised when the household item does not exist."""


class InstallmentAlreadyExistsError(Exception):
    """Raised when the item already has an installment plan."""


def compute_last_payment_date(start_date: date, total_installments: int, payment_day: int) -> date:
    month_index = start_date.month - 1 + (total_installments - 1)
    year = start_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(payment_day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def create_installment(db: Session, item_id: uuid.UUID, data: InstallmentCreate) -> Installment:
    item = db.get(HouseholdItem, item_id)
    if item is None:
        raise ItemNotFoundError(f"Item {item_id} does not exist")
    if item.installment is not None:
        raise InstallmentAlreadyExistsError(f"Item {item_id} already has an installment plan")

    installment = Installment(
        item_id=item_id,
        total_installments=data.total_installments,
        paid_installments=data.paid_installments,
        payment_day=data.payment_day,
        start_date=data.start_date,
        amount_per_installment=data.amount_per_installment,
        notes=data.notes,
    )
    db.add(installment)
    db.commit()
    db.refresh(installment)
    return installment


def get_installment(db: Session, item_id: uuid.UUID) -> Installment | None:
    item = db.get(HouseholdItem, item_id)
    return item.installment if item is not None else None


def update_installment(db: Session, installment: Installment, data: InstallmentUpdate) -> Installment:
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(installment, field, value)

    db.commit()
    db.refresh(installment)
    return installment


def delete_installment(db: Session, installment: Installment) -> None:
    db.delete(installment)
    db.commit()


def list_installments(db: Session, *, user_id: uuid.UUID | None = None) -> list[Installment]:
    stmt = (
        select(Installment)
        .join(Installment.item)
        .order_by(HouseholdItem.name)
    )
    if user_id is not None:
        stmt = stmt.where(HouseholdItem.user_id == user_id)
    return list(db.scalars(stmt))
