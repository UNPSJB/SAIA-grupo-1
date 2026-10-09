from datetime import date, timedelta
from typing import Dict
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.checklist.models import Checklist
from src.personal.models import Personal
from src.tareas.models import Tarea
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


# ---------------------------------------------------------------- checklist por rol


def _generar_checklist_de_hoy(admin: Personal, legajo: int = 1) -> dict:
    respuesta = client.post("/checklist/generar", json={"responsable_legajo": legajo}, headers=headers(admin))
    assert respuesta.status_code == status.HTTP_201_CREATED
    return respuesta.json()


def test_generar_checklist_pide_estar_logueado(usuarios: Dict[str, Personal]) -> None:
    assert _pedir("POST", "/checklist/generar").status_code == status.HTTP_401_UNAUTHORIZED


def test_el_operador_genera_solo_su_propio_checklist(usuarios: Dict[str, Personal]) -> None:
    operador = usuarios["operador"]
    cabeceras = headers(operador)

    ajeno = client.post("/checklist/generar", json={"responsable_legajo": usuarios["ambos"].legajo}, headers=cabeceras)
    assert ajeno.status_code == status.HTTP_403_FORBIDDEN

    propio = client.post("/checklist/generar", json={"responsable_legajo": operador.legajo}, headers=cabeceras)
    assert propio.status_code == status.HTTP_201_CREATED
    # solo trae las tareas que tiene asignadas
    assert all(t["responsable_legajo"] == operador.legajo for t in propio.json()["items"])


def test_el_checklist_solo_trae_las_tareas_del_responsable(session: Session, usuarios: Dict[str, Personal]) -> None:
    tarea = session.get(Tarea, 2)
    tarea.personal_id = usuarios["ambos"].legajo
    session.commit()

    del_operador = _generar_checklist_de_hoy(usuarios["administrador"])
    assert [t["nombre_tarea"] for t in del_operador["items"]] == ["Desinfeccion"]

    del_otro = client.post("/checklist/generar", json={"responsable_legajo": usuarios["ambos"].legajo},
                           headers=headers(usuarios["administrador"])).json()
    assert [t["nombre_tarea"] for t in del_otro["items"]] == ["Descongelar"]


def test_el_operador_ve_solo_sus_checklists_con_su_historial(session: Session, usuarios: Dict[str, Personal]) -> None:
    propio = _generar_checklist_de_hoy(usuarios["administrador"])
    ajeno = client.post("/checklist/generar", json={"responsable_legajo": usuarios["ambos"].legajo},
                        headers=headers(usuarios["administrador"]))
    # el checklist del otro no tiene tareas (todas son del operador): se lo asignamos a mano
    assert ajeno.status_code == status.HTTP_400_BAD_REQUEST
    ayer = date.today() - timedelta(days=1)
    session.get(Checklist, propio["id"]).fecha = ayer
    session.commit()
    otro = Checklist(fecha=date.today(), responsable_legajo=usuarios["ambos"].legajo)
    session.add(otro)
    session.commit()

    operador = headers(usuarios["operador"])
    administrador = headers(usuarios["administrador"])

    # el operador ve su checklist de ayer (historial) y no el del otro
    ids = [c["id"] for c in client.get("/checklist/", headers=operador).json()]
    assert propio["id"] in ids and otro.id not in ids
    assert client.get(f"/checklist/{propio['id']}", headers=operador).status_code == status.HTTP_200_OK
    assert client.get(f"/checklist/{otro.id}", headers=operador).status_code == status.HTTP_403_FORBIDDEN
    # los filtros de fecha valen tambien para el operador
    assert propio["id"] not in [c["id"] for c in client.get(f"/checklist/?fecha={date.today().isoformat()}", headers=operador).json()]

    # el administrador ve el de todos
    ids_admin = [c["id"] for c in client.get("/checklist/", headers=administrador).json()]
    assert propio["id"] in ids_admin and otro.id in ids_admin


def test_nadie_completa_una_tarea_asignada_a_otro(session: Session, usuarios: Dict[str, Personal]) -> None:
    checklist = _generar_checklist_de_hoy(usuarios["administrador"])
    item = checklist["items"][0]["id"]
    # un usuario AMBAS ve todos los checklists, pero la tarea es del operador
    respuesta = client.post(
        f"/checklist/{checklist['id']}/tareas/{item}/completar",
        json={"responsable_legajo": usuarios["ambos"].legajo},
        headers=headers(usuarios["ambos"]),
    )
    assert respuesta.status_code == status.HTTP_403_FORBIDDEN


def test_el_responsable_de_la_tarea_debe_ser_un_usuario_activo(session: Session, usuarios: Dict[str, Personal]) -> None:
    datos = {"nombre": "Tarea nueva", "descripcion": "Paso 1 limpiar", "frecuencia": "diaria", "plan_id": 1}
    cabeceras = headers(usuarios["administrador"])

    assert client.post("/tareas/", json={**datos, "personal_id": 9999}, headers=cabeceras).status_code == 400
    assert client.post("/tareas/", json=datos, headers=cabeceras).status_code == 422

    usuarios["ambos"].activo = False
    session.commit()
    assert client.post("/tareas/", json={**datos, "personal_id": usuarios["ambos"].legajo},
                       headers=cabeceras).status_code == 400

    ok = client.post("/tareas/", json={**datos, "personal_id": usuarios["operador"].legajo}, headers=cabeceras)
    assert ok.status_code == 200
    assert ok.json()["personal_id"] == usuarios["operador"].legajo


def test_la_autoria_de_la_tarea_sale_del_token(usuarios: Dict[str, Personal]) -> None:
    checklist = _generar_checklist_de_hoy(usuarios["administrador"])
    tarea = checklist["items"][0]["id"]
    operador = usuarios["operador"]

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
    checklist = _generar_checklist_de_hoy(usuarios["administrador"])
    tarea = checklist["items"][0]["id"]
    ruta = f"/checklist/{checklist['id']}/tareas/{tarea}"
    cabeceras = headers(usuarios["administrador"])

    completar = client.post(f"{ruta}/completar", json={"responsable_legajo": 1}, headers=cabeceras)
    assert completar.status_code == status.HTTP_403_FORBIDDEN
    assert client.delete(f"{ruta}/imagen", headers=cabeceras).status_code == status.HTTP_403_FORBIDDEN
    subir = client.post(f"{ruta}/imagen", files={"file": ("a.png", b"x", "image/png")}, headers=cabeceras)
    assert subir.status_code == status.HTTP_403_FORBIDDEN


def test_el_rol_ambos_puede_operar(session: Session, usuarios: Dict[str, Personal]) -> None:
    for tarea in session.query(Tarea).all():
        tarea.personal_id = usuarios["ambos"].legajo
    session.commit()
    checklist = _generar_checklist_de_hoy(usuarios["ambos"], usuarios["ambos"].legajo)
    tarea = checklist["items"][0]["id"]
    respuesta = client.post(
        f"/checklist/{checklist['id']}/tareas/{tarea}/completar",
        json={"responsable_legajo": 1},
        headers=headers(usuarios["ambos"]),
    )
    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["responsable_legajo"] == usuarios["ambos"].legajo
