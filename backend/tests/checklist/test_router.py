import io
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


def test_post_generar_checklist_fecha_pasada_falla(session: Session) -> None:
    pasado = (date.today() - timedelta(days=1)).isoformat()
    response = client.post(
        "/checklist/generar",
        json={"fecha": pasado, "responsable_legajo": 1},
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


def test_get_checklists_filtrar_por_rango_fechas(session: Session) -> None:
    hoy = date.today().isoformat()
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1, "fecha": hoy},
    )
    checklist_id = res_crear.json()["id"]

    res_ok = client.get(f"/checklist/?fecha_desde={hoy}&fecha_hasta={hoy}")
    assert res_ok.status_code == status.HTTP_200_OK
    assert any(c["id"] == checklist_id for c in res_ok.json())

    pasado = (date.today() - timedelta(days=10)).isoformat()
    pasado_fin = (date.today() - timedelta(days=5)).isoformat()
    res_vacio = client.get(f"/checklist/?fecha_desde={pasado}&fecha_hasta={pasado_fin}")
    assert res_vacio.status_code == status.HTTP_200_OK
    assert not any(c["id"] == checklist_id for c in res_vacio.json())

    res_invalido = client.get(f"/checklist/?fecha_desde={hoy}&fecha_hasta={pasado}")
    assert res_invalido.status_code == status.HTTP_400_BAD_REQUEST


def test_get_checklists_filtrar_por_estado(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]

    res_pendientes = client.get("/checklist/?estado=pendiente")
    assert res_pendientes.status_code == status.HTTP_200_OK
    assert any(c["id"] == checklist_id for c in res_pendientes.json())

    res_completados = client.get("/checklist/?estado=completado")
    assert res_completados.status_code == status.HTTP_200_OK
    assert not any(c["id"] == checklist_id for c in res_completados.json())




def test_post_completar_tarea(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    payload = {
        "responsable_legajo": 1,
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


def test_tarea_no_parcialmente_actualizable(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    res_get = client.get(f"/checklist/{checklist_id}/tareas/{item_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == item_id

    res_patch = client.patch(
        f"/checklist/{checklist_id}/tareas/{item_id}",
        json={"responsable_legajo": 1},
    )
    assert res_patch.status_code == status.HTTP_405_METHOD_NOT_ALLOWED



def test_subir_y_eliminar_imagen_directa_tarea(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    archivo_fake = io.BytesIO(b"dummy image bytes")
    res_upload = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/imagen",
        files={"file": ("foto_evidencia.jpg", archivo_fake, "image/jpeg")},
    )
    assert res_upload.status_code == status.HTTP_200_OK
    data_upload = res_upload.json()
    url_imagen = data_upload["imagen"]
    assert url_imagen.startswith("/checklist/imagenes/")

    res_img = client.get(url_imagen)
    assert res_img.status_code == status.HTTP_200_OK
    assert res_img.content == b"dummy image bytes"

    res_del_img = client.delete(f"/checklist/{checklist_id}/tareas/{item_id}/imagen")
    assert res_del_img.status_code == status.HTTP_200_OK
    assert res_del_img.json()["imagen"] is None

    res_img_despues = client.get(url_imagen)
    assert res_img_despues.status_code == status.HTTP_404_NOT_FOUND


def test_subir_imagen_formato_invalido(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    archivo_pdf = io.BytesIO(b"dummy pdf bytes")
    res_upload = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/imagen",
        files={"file": ("documento.pdf", archivo_pdf, "application/pdf")},
    )
    assert res_upload.status_code == status.HTTP_400_BAD_REQUEST


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


def test_checklist_no_eliminable(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]

    res_del = client.delete(f"/checklist/{checklist_id}")
    assert res_del.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_tarea_completada_no_modificable(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    res_comp = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/completar",
        json={"responsable_legajo": 1},
    )
    assert res_comp.status_code == status.HTTP_200_OK

    res_patch = client.patch(
        f"/checklist/{checklist_id}/tareas/{item_id}",
        json={"responsable_legajo": 2},
    )
    assert res_patch.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    archivo_fake = io.BytesIO(b"bytes")
    res_upload = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/imagen",
        files={"file": ("foto.jpg", archivo_fake, "image/jpeg")},
    )
    assert res_upload.status_code == status.HTTP_400_BAD_REQUEST

    res_recomp = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/completar",
        json={"responsable_legajo": 1},
    )
    assert res_recomp.status_code == status.HTTP_400_BAD_REQUEST


def test_checklist_vencido_no_modificable(session: Session) -> None:
    from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem
    from src.tareas.models import Frecuencia

    antiguo = date.today() - timedelta(days=2)
    checklist_vencido = Checklist(
        fecha=antiguo,
        responsable_legajo=1,
        activo=True,
        items=[
            ChecklistItem(
                nombre_plan="PlanVencido",
                nombre_tarea="TareaDiariaVencida",
                frecuencia=Frecuencia.DIARIA,
                estado=EstadoTareaItem.PENDIENTE,
            )
        ],
    )
    session.add(checklist_vencido)
    session.commit()
    session.refresh(checklist_vencido)

    res_comp = client.post(
        f"/checklist/{checklist_vencido.id}/tareas/{checklist_vencido.items[0].id}/completar",
        json={"responsable_legajo": 1},
    )
    assert res_comp.status_code == status.HTTP_400_BAD_REQUEST

    res_patch = client.patch(
        f"/checklist/{checklist_vencido.id}/tareas/{checklist_vencido.items[0].id}",
        json={"responsable_legajo": 1},
    )
    assert res_patch.status_code == status.HTTP_405_METHOD_NOT_ALLOWED


def test_post_marcar_tarea_no_realizada_endpoint(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    res_no_realizada = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/no-realizada",
        json={
            "motivo": "falta_de_insumo",
            "observacion": "Falta químico desincrustante",
        },
    )
    assert res_no_realizada.status_code == status.HTTP_200_OK
    data = res_no_realizada.json()
    assert data["estado"] == "no_realizado"
    assert data["motivo_no_realizado"] == "falta_de_insumo"
    assert data["observacion_no_realizado"] == "Falta químico desincrustante"
    assert data["fecha_hora_no_realizado"] is not None


def test_post_marcar_tarea_no_realizada_validacion_otro(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    res_sin_obs = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/no-realizada",
        json={"motivo": "otro", "observacion": ""},
    )
    assert res_sin_obs.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY)

    res_con_obs = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/no-realizada",
        json={"motivo": "otro", "observacion": "Parada imprevista de planta"},
    )
    assert res_con_obs.status_code == status.HTTP_200_OK
    assert res_con_obs.json()["motivo_no_realizado"] == "otro"


def test_no_permitir_modificar_justificacion_despues_de_hecha(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    res_primera = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/no-realizada",
        json={"motivo": "falta_de_insumo", "observacion": "Falta químico"},
    )
    assert res_primera.status_code == status.HTTP_200_OK

    res_segunda = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/no-realizada",
        json={"motivo": "equipo_fuera_de_uso", "observacion": "Cambio de motivo"},
    )
    assert res_segunda.status_code == status.HTTP_400_BAD_REQUEST


