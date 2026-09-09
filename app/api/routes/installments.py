import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DbSession
from app.db.models import Installment
from app.schemas.installment import (
    InstallmentCreate,
    InstallmentOverviewRead,
    InstallmentRead,
    InstallmentUpdate,
)
from app.services.installment import (
    InstallmentAlreadyExistsError,
    ItemNotFoundError,
    compute_last_payment_date,
    create_installment,
    delete_installment,
    get_installment,
    list_installments,
    update_installment,
)
from app.services.inventory import get_item

router = APIRouter(tags=["installments"])


def _ensure_owned_item(db: DbSession, item_id: uuid.UUID, current_user: CurrentUser) -> None:
    if get_item(db, item_id, current_user.id) is None:
        raise HTTPException(status_code=404, detail="Item not found")


def _to_read(installment: Installment) -> InstallmentRead:
    last_payment_date = compute_last_payment_date(
        installment.start_date, installment.total_installments, installment.payment_day
    )
    return InstallmentRead(
        id=installment.id,
        item_id=installment.item_id,
        total_installments=installment.total_installments,
        paid_installments=installment.paid_installments,
        remaining_installments=installment.total_installments - installment.paid_installments,
        payment_day=installment.payment_day,
        start_date=installment.start_date,
        amount_per_installment=installment.amount_per_installment,
        notes=installment.notes,
        last_payment_date=last_payment_date,
    )


def _to_overview(installment: Installment) -> InstallmentOverviewRead:
    read = _to_read(installment)
    return InstallmentOverviewRead(
        **read.model_dump(),
        item_name=installment.item.name,
        item_status=installment.item.status,
    )


@router.post("/items/{item_id}/installment", response_model=InstallmentRead, status_code=status.HTTP_201_CREATED)
def create_installment_endpoint(
    item_id: uuid.UUID, payload: InstallmentCreate, db: DbSession, current_user: CurrentUser
) -> InstallmentRead:
    _ensure_owned_item(db, item_id, current_user)
    try:
        return _to_read(create_installment(db, item_id, payload))
    except ItemNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InstallmentAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/items/{item_id}/installment", response_model=InstallmentRead)
def get_installment_endpoint(item_id: uuid.UUID, db: DbSession, current_user: CurrentUser) -> InstallmentRead:
    _ensure_owned_item(db, item_id, current_user)
    installment = get_installment(db, item_id)
    if installment is None:
        raise HTTPException(status_code=404, detail="Installment plan not found")
    return _to_read(installment)


@router.patch("/items/{item_id}/installment", response_model=InstallmentRead)
def update_installment_endpoint(
    item_id: uuid.UUID, payload: InstallmentUpdate, db: DbSession, current_user: CurrentUser
) -> InstallmentRead:
    _ensure_owned_item(db, item_id, current_user)
    installment = get_installment(db, item_id)
    if installment is None:
        raise HTTPException(status_code=404, detail="Installment plan not found")
    return _to_read(update_installment(db, installment, payload))


@router.delete("/items/{item_id}/installment", status_code=status.HTTP_204_NO_CONTENT)
def delete_installment_endpoint(item_id: uuid.UUID, db: DbSession, current_user: CurrentUser) -> None:
    _ensure_owned_item(db, item_id, current_user)
    installment = get_installment(db, item_id)
    if installment is None:
        raise HTTPException(status_code=404, detail="Installment plan not found")
    delete_installment(db, installment)


@router.get("/installments", response_model=list[InstallmentOverviewRead])
def list_installments_endpoint(db: DbSession, current_user: CurrentUser) -> list[InstallmentOverviewRead]:
    return [_to_overview(installment) for installment in list_installments(db, user_id=current_user.id)]
