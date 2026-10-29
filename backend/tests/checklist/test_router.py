import io
from datetime import date, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session
from src.checklist import models
from src.tareas.models import Frecuencia

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


def test_reasignar_tarea_router_exitoso(session: Session) -> None:
    from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem
    from src.tareas.models import Frecuencia

    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    chk_destino = Checklist(
        fecha=date.today(),
        responsable_legajo=2,
        activo=True,
        items=[
            ChecklistItem(
                nombre_plan="Plan Ana",
                nombre_tarea="Tarea Ana",
                frecuencia=Frecuencia.DIARIA,
                estado=EstadoTareaItem.PENDIENTE,
                responsable_legajo=2,
            )
        ],
    )
    session.add(chk_destino)
    session.commit()

    res_reasignar = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/reasignar",
        json={"nuevo_responsable_legajo": 2, "motivo": "Relevo de turno"},
    )
    assert res_reasignar.status_code == status.HTTP_200_OK
    data = res_reasignar.json()
    assert data["estado"] == "reasignado"


def test_reasignar_tarea_router_no_admin_403(session: Session) -> None:
    from types import SimpleNamespace
    from src.autenticacion.dependencies import get_usuario_actual
    from src.personal.schemas import Capacidades

    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    app.dependency_overrides[get_usuario_actual] = lambda: SimpleNamespace(
        legajo=2, capacidad=Capacidades.OPERAR, activo=True, nombre="Solo", apellido="Operador"
    )
    try:
        res = client.post(
            f"/checklist/{checklist_id}/tareas/{item_id}/reasignar",
            json={"nuevo_responsable_legajo": 1},
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN
    finally:
        from tests.database import USUARIO_DE_PRUEBA
        app.dependency_overrides[get_usuario_actual] = lambda: USUARIO_DE_PRUEBA


def test_reasignar_tarea_router_operador_sin_checklist_400(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    item_id = res_crear.json()["items"][0]["id"]

    res = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/reasignar",
        json={"nuevo_responsable_legajo": 2},
    )
    assert res.status_code == status.HTTP_400_BAD_REQUEST


def test_reasignar_tarea_no_diaria_router_sin_checklist_200(session: Session) -> None:
    res_crear = client.post(
        "/checklist/generar",
        json={"responsable_legajo": 1},
    )
    checklist_id = res_crear.json()["id"]
    items = res_crear.json()["items"]
    item_semanal = next((it for it in items if it["frecuencia"] == "SEMANAL"), None)
    if not item_semanal:
        item = models.ChecklistItem(
            checklist_id=checklist_id,
            nombre_plan="Plan Router Semanal",
            nombre_tarea="Tarea Router Semanal",
            frecuencia=models.Frecuencia.SEMANAL,
            _estado=models.EstadoTareaItem.PENDIENTE,
            responsable_legajo=1,
        )
        session.add(item)
        session.commit()
        item_id = item.id
    else:
        item_id = item_semanal["id"]

    res = client.post(
        f"/checklist/{checklist_id}/tareas/{item_id}/reasignar",
        json={"nuevo_responsable_legajo": 2, "motivo": "Reasignada via router"},
    )
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["estado"] == "reasignado"


def test_get_tareas_no_realizadas_admin_200(session: Session) -> None:
    res = client.get("/checklist/tareas-no-realizadas")
    assert res.status_code == status.HTTP_200_OK
    assert isinstance(res.json(), list)


def test_get_tareas_no_realizadas_no_admin_403(session: Session) -> None:
    from types import SimpleNamespace
    from src.autenticacion.dependencies import get_usuario_actual
    from src.personal.schemas import Capacidades

    app.dependency_overrides[get_usuario_actual] = lambda: SimpleNamespace(
        legajo=2, capacidad=Capacidades.OPERAR, activo=True, nombre="Solo", apellido="Operador"
    )
    try:
        res = client.get("/checklist/tareas-no-realizadas")
        assert res.status_code == status.HTTP_403_FORBIDDEN
    finally:
        from tests.database import USUARIO_DE_PRUEBA
        app.dependency_overrides[get_usuario_actual] = lambda: USUARIO_DE_PRUEBA
