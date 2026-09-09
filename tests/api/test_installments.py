from datetime import date

from tests.factories.model_factories import make_category, make_room, make_user


def _create_item(client, db_session, name="Sofa", user=None):
    user = user or make_user(db_session, email=f"{name.lower()}@example.com")
    room = make_room(db_session, name=f"{name}-room")
    category = make_category(db_session, name=f"{name}-category")
    response = client.post(
        "/items",
        json={"name": name, "room_id": str(room.id), "category_id": str(category.id), "user_id": str(user.id)},
    )
    return response.json()["id"]


def test_create_get_update_delete_installment(client, db_session):
    item_id = _create_item(client, db_session)
    start_date = date(2026, 1, 15).isoformat()

    response = client.post(
        f"/items/{item_id}/installment",
        json={"total_installments": 12, "payment_day": 15, "start_date": start_date, "amount_per_installment": "50.00"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["total_installments"] == 12
    assert body["paid_installments"] == 0
    assert body["remaining_installments"] == 12
    assert body["last_payment_date"] == date(2026, 12, 15).isoformat()

    response = client.get(f"/items/{item_id}/installment")
    assert response.status_code == 200
    assert response.json()["total_installments"] == 12

    response = client.patch(f"/items/{item_id}/installment", json={"paid_installments": 3})
    assert response.status_code == 200
    assert response.json()["paid_installments"] == 3
    assert response.json()["remaining_installments"] == 9

    response = client.delete(f"/items/{item_id}/installment")
    assert response.status_code == 204

    response = client.get(f"/items/{item_id}/installment")
    assert response.status_code == 404


def test_create_duplicate_installment_returns_409(client, db_session):
    item_id = _create_item(client, db_session)
    payload = {"total_installments": 6, "payment_day": 1, "start_date": date.today().isoformat()}

    client.post(f"/items/{item_id}/installment", json=payload)
    response = client.post(f"/items/{item_id}/installment", json=payload)

    assert response.status_code == 409


def test_last_payment_date_clamps_short_months(client, db_session):
    item_id = _create_item(client, db_session)

    response = client.post(
        f"/items/{item_id}/installment",
        json={"total_installments": 2, "payment_day": 31, "start_date": date(2026, 1, 31).isoformat()},
    )
    assert response.status_code == 201
    assert response.json()["last_payment_date"] == date(2026, 2, 28).isoformat()


def test_list_installments_dashboard(client, db_session):
    user = make_user(db_session, email="owner@example.com")
    first_id = _create_item(client, db_session, name="Sofa", user=user)
    client.post(
        f"/items/{first_id}/installment",
        json={"total_installments": 4, "payment_day": 5, "start_date": date.today().isoformat()},
    )

    second_id = _create_item(client, db_session, name="Fridge", user=user)
    client.post(
        f"/items/{second_id}/installment",
        json={"total_installments": 10, "payment_day": 10, "start_date": date.today().isoformat()},
    )

    response = client.get("/installments")
    assert response.status_code == 200
    body = response.json()
    assert {entry["item_id"] for entry in body} == {first_id, second_id}
    assert all("item_name" in entry for entry in body)


def test_versioned_installment_list_is_user_scoped(client, db_session):
    first_item_id = _create_item(client, db_session, name="Owned Sofa")
    second_item_id = _create_item(client, db_session, name="Other Sofa")
    client.post(
        f"/items/{first_item_id}/installment",
        json={"total_installments": 4, "payment_day": 5, "start_date": date.today().isoformat()},
    )
    client.post(
        f"/items/{second_item_id}/installment",
        json={"total_installments": 4, "payment_day": 5, "start_date": date.today().isoformat()},
    )

    response = client.get("/api/v1/installments")
    assert response.status_code == 200
    assert [entry["item_id"] for entry in response.json()] == [first_item_id]
