from datetime import date, timedelta
from typing import Dict
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem
from src.personal.models import Personal
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.tareas.models import Frecuencia, Tarea
from tests.autenticacion.conftest import headers
from tests.database import app

client = TestClient(app)

# Endpoints que solo puede usar un administrador (ADMINISTRAR o AMBAS).
SOLO_ADMIN = [
    ("GET", "/personal/"),
    ("POST", "/personal/"),
    ("PUT", "/personal/1"),
    ("GET", "/insumos/"),
    ("POST", "/insumos/"),
    ("PATCH", "/insumos/1"),
    ("DELETE", "/insumos/1"),
    ("PATCH", "/insumos/1/stock"),
    ("GET", "/equipos/"),
    ("POST", "/equipos/"),
    ("PUT", "/equipos/1"),
    ("DELETE", "/equipos/1"),
    ("PATCH", "/equipos/1/reactivar"),
    ("GET", "/elementosDeLimpieza/"),
    ("POST", "/elementosDeLimpieza/"),
    ("PUT", "/elementosDeLimpieza/1"),
    ("DELETE", "/elementosDeLimpieza/1"),
    ("POST", "/elementosDeLimpieza/1/cambiar"),
    ("GET", "/plan_De_limpieza/"),
    ("POST", "/plan_De_limpieza/"),
    ("PUT", "/plan_De_limpieza/1"),
    ("GET", "/tareas/"),
    ("POST", "/tareas/"),
    ("PUT", "/tareas/1"),
    ("DELETE", "/tareas/1"),
    ("GET", "/auditoria/"),
    ("GET", "/dashboard/resumen"),
    ("GET", "/dashboard/cumplimiento"),
    ("GET", "/dashboard/consumo-insumos"),
    ("POST", "/api/insumos-quimicos"),
    ("PUT", "/api/insumos-quimicos/1"),
    ("PATCH", "/api/insumos-quimicos/1/toggle"),
]

# Endpoints que piden estar logueado, sin importar el rol.
CUALQUIER_USUARIO = [
    ("GET", "/api/insumos-quimicos"),
    ("GET", "/checklist/"),
    ("GET", "/autenticacion/me"),
]


def _pedir(metodo: str, ruta: str, cabeceras=None):
    return client.request(metodo, ruta, headers=cabeceras, json={} if metodo in ("POST", "PUT", "PATCH") else None)


@pytest.mark.parametrize("metodo,ruta", SOLO_ADMIN + CUALQUIER_USUARIO)
def test_sin_token_no_se_puede_entrar(usuarios: Dict[str, Personal], metodo: str, ruta: str) -> None:
    assert _pedir(metodo, ruta).status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("metodo,ruta", SOLO_ADMIN)
def test_el_operador_no_puede_administrar(usuarios: Dict[str, Personal], metodo: str, ruta: str) -> None:
    respuesta = _pedir(metodo, ruta, headers(usuarios["operador"]))
    assert respuesta.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("rol", ["administrador", "ambos"])
@pytest.mark.parametrize("metodo,ruta", SOLO_ADMIN)
def test_el_administrador_pasa_el_control_de_permisos(
    usuarios: Dict[str, Personal], rol: str, metodo: str, ruta: str
) -> None:
    # No nos importa si despues falla por datos (404, 422...): solo que no lo frene el permiso.
    respuesta = _pedir(metodo, ruta, headers(usuarios[rol]))
    assert respuesta.status_code not in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


@pytest.mark.parametrize("rol", ["operador", "administrador", "ambos"])
@pytest.mark.parametrize("metodo,ruta", CUALQUIER_USUARIO)
def test_endpoints_para_cualquier_usuario_logueado(
    usuarios: Dict[str, Personal], rol: str, metodo: str, ruta: str
) -> None:
    assert _pedir(metodo, ruta, headers(usuarios[rol])).status_code == status.HTTP_200_OK


def test_la_imagen_de_evidencia_no_pide_token(usuarios: Dict[str, Personal]) -> None:
    # Es publica a proposito (se pide desde <img>). Un archivo inexistente da 404, no 401.
    respuesta = client.get("/checklist/imagenes/no_existe.jpg")
    assert respuesta.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------- checklist por operador


def _generar_checklist_de_hoy(persona: Personal) -> dict:
    respuesta = client.post("/checklist/generar", json={}, headers=headers(persona))
    assert respuesta.status_code == status.HTTP_201_CREATED
    return respuesta.json()


def _asignar_tarea(session: Session, persona: Personal) -> None:
    """Las tareas del seed de tests son del operador (legajo 1); le damos una propia a otra persona."""
    plan = session.query(Plan_de_Limpieza).first()
    session.add(Tarea(nombre="Propia", descripcion="Tarea propia", frecuencia=Frecuencia.DIARIA,
                      plan_id=plan.id, operador_legajo=persona.legajo))
    session.commit()


def _checklist_de(session: Session, persona: Personal, fecha: date) -> Checklist:
    checklist = Checklist(fecha=fecha, responsable_legajo=persona.legajo, activo=True, items=[
        ChecklistItem(nombre_plan="Plan", nombre_tarea="Tarea", frecuencia=Frecuencia.DIARIA,
                      estado=EstadoTareaItem.PENDIENTE),
    ])
    session.add(checklist)
    session.commit()
    return checklist


def test_el_operador_genera_su_propio_checklist(usuarios: Dict[str, Personal]) -> None:
    operador = usuarios["operador"]
    # aunque pida generarlo "a nombre de" otra persona, el responsable sale del token
    respuesta = client.post("/checklist/generar", json={"responsable_legajo": usuarios["ambos"].legajo},
                            headers=headers(operador))
    assert respuesta.status_code == status.HTTP_201_CREATED
    assert respuesta.json()["responsable_legajo"] == operador.legajo


def test_un_administrador_puro_no_puede_generar_checklist(usuarios: Dict[str, Personal]) -> None:
    respuesta = client.post("/checklist/generar", json={}, headers=headers(usuarios["administrador"]))
    assert respuesta.status_code == status.HTTP_403_FORBIDDEN


def test_el_operador_no_genera_dos_checklists_el_mismo_dia(usuarios: Dict[str, Personal]) -> None:
    _generar_checklist_de_hoy(usuarios["operador"])
    respuesta = client.post("/checklist/generar", json={}, headers=headers(usuarios["operador"]))
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


def test_el_operador_ve_su_checklist_del_dia(usuarios: Dict[str, Personal]) -> None:
    checklist = _generar_checklist_de_hoy(usuarios["operador"])
    cabeceras = headers(usuarios["operador"])

    assert any(c["id"] == checklist["id"] for c in client.get("/checklist/", headers=cabeceras).json())
    detalle = client.get(f"/checklist/{checklist['id']}", headers=cabeceras)
    assert detalle.status_code == status.HTTP_200_OK
    tarea = checklist["items"][0]["id"]
    assert client.get(f"/checklist/{checklist['id']}/tareas/{tarea}", headers=cabeceras).status_code == 200


def test_el_operador_ve_su_historial(session: Session, usuarios: Dict[str, Personal]) -> None:
    ayer = date.today() - timedelta(days=1)
    propio = _checklist_de(session, usuarios["operador"], ayer)
    operador = headers(usuarios["operador"])

    assert client.get(f"/checklist/{propio.id}", headers=operador).status_code == status.HTTP_200_OK
    historial = client.get(f"/checklist/?fecha={ayer.isoformat()}", headers=operador).json()
    assert [c["id"] for c in historial] == [propio.id]


def test_el_operador_no_ve_los_checklists_de_otros(session: Session, usuarios: Dict[str, Personal]) -> None:
    ajeno = _checklist_de(session, usuarios["ambos"], date.today())
    operador = headers(usuarios["operador"])

    assert client.get(f"/checklist/{ajeno.id}", headers=operador).status_code == status.HTTP_403_FORBIDDEN
    # el listado ignora el responsable que mande: siempre devuelve solo los propios
    pedido = client.get(f"/checklist/?responsable_legajo={usuarios['ambos'].legajo}", headers=operador)
    assert pedido.status_code == status.HTTP_200_OK
    assert all(c["responsable_legajo"] == usuarios["operador"].legajo for c in pedido.json())


def test_el_administrador_ve_los_checklists_de_todos(session: Session, usuarios: Dict[str, Personal]) -> None:
    del_operador = _checklist_de(session, usuarios["operador"], date.today() - timedelta(days=1))
    de_ambos = _checklist_de(session, usuarios["ambos"], date.today())
    administrador = headers(usuarios["administrador"])

    todos = [c["id"] for c in client.get("/checklist/", headers=administrador).json()]
    assert del_operador.id in todos and de_ambos.id in todos
    assert client.get(f"/checklist/{del_operador.id}", headers=administrador).status_code == status.HTTP_200_OK

    filtrado = client.get(f"/checklist/?responsable_legajo={usuarios['ambos'].legajo}", headers=administrador)
    assert [c["id"] for c in filtrado.json()] == [de_ambos.id]


def test_la_autoria_de_la_tarea_sale_del_token(usuarios: Dict[str, Personal]) -> None:
    operador = usuarios["operador"]
    checklist = _generar_checklist_de_hoy(operador)
    tarea = checklist["items"][0]["id"]

    # el operador intenta completar la tarea "a nombre de" otra persona
    otra_persona = usuarios["administrador"].legajo
    respuesta = client.post(
        f"/checklist/{checklist['id']}/tareas/{tarea}/completar",
        json={"responsable_legajo": otra_persona},
        headers=headers(operador),
    )
    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["responsable_legajo"] == operador.legajo


def test_un_administrador_puro_no_puede_operar(usuarios: Dict[str, Personal]) -> None:
    checklist = _generar_checklist_de_hoy(usuarios["operador"])
    tarea = checklist["items"][0]["id"]
    ruta = f"/checklist/{checklist['id']}/tareas/{tarea}"
    cabeceras = headers(usuarios["administrador"])

    completar = client.post(f"{ruta}/completar", json={"responsable_legajo": 1}, headers=cabeceras)
    assert completar.status_code == status.HTTP_403_FORBIDDEN
    assert client.delete(f"{ruta}/imagen", headers=cabeceras).status_code == status.HTTP_403_FORBIDDEN
    subir = client.post(f"{ruta}/imagen", files={"file": ("a.png", b"x", "image/png")}, headers=cabeceras)
    assert subir.status_code == status.HTTP_403_FORBIDDEN


def test_nadie_opera_el_checklist_de_otro(usuarios: Dict[str, Personal]) -> None:
    # 'ambos' puede ver el checklist del operador (es administrador), pero no ejecutar sus tareas
    checklist = _generar_checklist_de_hoy(usuarios["operador"])
    tarea = checklist["items"][0]["id"]
    ruta = f"/checklist/{checklist['id']}/tareas/{tarea}"
    cabeceras = headers(usuarios["ambos"])

    assert client.get(f"/checklist/{checklist['id']}", headers=cabeceras).status_code == status.HTTP_200_OK
    completar = client.post(f"{ruta}/completar", json={"responsable_legajo": 1}, headers=cabeceras)
    assert completar.status_code == status.HTTP_403_FORBIDDEN
    subir = client.post(f"{ruta}/imagen", files={"file": ("a.png", b"x", "image/png")}, headers=cabeceras)
    assert subir.status_code == status.HTTP_403_FORBIDDEN


def test_el_rol_ambos_puede_operar_su_checklist(session: Session, usuarios: Dict[str, Personal]) -> None:
    _asignar_tarea(session, usuarios["ambos"])
    checklist = _generar_checklist_de_hoy(usuarios["ambos"])
    tarea = checklist["items"][0]["id"]
    respuesta = client.post(
        f"/checklist/{checklist['id']}/tareas/{tarea}/completar",
        json={"responsable_legajo": 1},
        headers=headers(usuarios["ambos"]),
    )
    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["responsable_legajo"] == usuarios["ambos"].legajo
