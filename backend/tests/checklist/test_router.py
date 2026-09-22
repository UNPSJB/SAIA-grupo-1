from datetime import date, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)


def test_post_generar_checklist(session: Session) -> None:
    hoy = date.today().isoformat()
    response = client.post(
        "/checklist/generar",
        json={"fecha": hoy, "responsable_legajo": 1},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["fecha"] == hoy
    assert data["responsable_legajo"] == 1
    assert data["nombre_responsable"] == "Juan Perez"
    assert data["total_tareas"] >= 1
    assert data["estado"] == "pendiente"
    assert data["porcentaje_cumplimiento"] == 0.0
    assert data["activo"] is True


def test_post_generar_checklist_fecha_futura_falla(session: Session) -> None:
    futuro = (date.today() + timedelta(days=1)).isoformat()
    response = client.post(
        "/checklist/generar",
        json={"fecha": futuro, "responsable_legajo": 1},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_get_checklists_y_detalle(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]

    res_list = client.get("/checklist/")
    assert res_list.status_code == status.HTTP_200_OK
    assert any(c["id"] == checklist_id for c in res_list.json())

    res_detalle = client.get(f"/checklist/{checklist_id}")
    assert res_detalle.status_code == status.HTTP_200_OK
    assert res_detalle.json()["id"] == checklist_id
    assert res_detalle.json()["responsable_legajo"] == 1
    assert len(res_detalle.json()["items"]) >= 1


def test_post_completar_tarea(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    payload = {
        "responsable_legajo": 1,
        "imagen": "http://servidor/fotos/limpieza.png",
        "insumos_utilizados": [
            {"nombre": "Detergente desengrasante", "cantidad": 50.0, "unidad": "mililitros"}
        ],
    }

    res_comp = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/completar",
        json=payload,
    )
    assert res_comp.status_code == status.HTTP_200_OK
    data = res_comp.json()
    assert data["estado"] == "realizado"
    assert data["responsable_legajo"] == 1
    assert data["nombre_responsable"] == "Juan Perez"
    assert data["fecha_hora_fin"] is not None
    assert len(data["insumos_utilizados"]) == 1


def test_patch_actualizar_tarea(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    payload = {
        "responsable_legajo": 1,
        "imagen": "http://servidor/evidencias/nueva.jpg",
        "estado": "realizado",
        "insumos_utilizados": [
            {"nombre": "Cloro activo", "cantidad": 100.0, "unidad": "ml"}
        ],
    }

    res_patch = client.patch(
        f"/checklist/{checklist_id}/tareas/{item_id}",
        json=payload,
    )
    assert res_patch.status_code == status.HTTP_200_OK
    data = res_patch.json()
    assert data["responsable_legajo"] == 1
    assert data["nombre_responsable"] == "Juan Perez"
    assert data["imagen"] == "http://servidor/evidencias/nueva.jpg"
    assert data["estado"] == "realizado"
    assert data["fecha_hora_fin"] is not None
    assert len(data["insumos_utilizados"]) == 1


def test_checklist_no_editable(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]

    res_put = client.put(f"/checklist/{checklist_id}", json={"responsable_legajo": 2})
    assert res_put.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_tarea_no_eliminable(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    res_del_item = client.delete(f"/checklist/{checklist_id}/tareas/{item_id}")
    assert res_del_item.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_delete_checklist_baja_logica(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]

    res_del = client.delete(f"/checklist/{checklist_id}")
    assert res_del.status_code == status.HTTP_200_OK
    assert res_del.json()["activo"] is False

    res_404 = client.get(f"/checklist/{checklist_id}")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND

    res_list = client.get("/checklist/")
    assert not any(c["id"] == checklist_id for c in res_list.json())


def test_restaurar_checklist_endpoint(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]

    client.delete(f"/checklist/{checklist_id}")

    res_inactive = client.get(f"/checklist/{checklist_id}?incluir_inactivos=true")
    assert res_inactive.status_code == status.HTTP_200_OK
    assert res_inactive.json()["activo"] is False

    res_restaurar = client.post(f"/checklist/{checklist_id}/restaurar")
    assert res_restaurar.status_code == status.HTTP_200_OK
    assert res_restaurar.json()["activo"] is True

    res_activo = client.get(f"/checklist/{checklist_id}")
    assert res_activo.status_code == status.HTTP_200_OK
    assert res_activo.json()["activo"] is True

    res_restaurar_activo = client.post(f"/checklist/{checklist_id}/restaurar")
    assert res_restaurar_activo.status_code == status.HTTP_400_BAD_REQUEST


def test_restaurar_checklist_inexistente(session: Session) -> None:
    res = client.post("/checklist/99999/restaurar")
    assert res.status_code == status.HTTP_404_NOT_FOUND
