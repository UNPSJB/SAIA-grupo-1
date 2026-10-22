from datetime import date, timedelta
from typing import Any, Dict
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.personal.models import Personal
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios  # noqa: F401  (son fixtures)
from tests.database import app, session  # noqa: F401  (session es una fixture)

client = TestClient(app)


def _lote(**cambios: Any) -> Dict[str, Any]:
    base: Dict[str, Any] = {
        "producto_nombre": "Pan lactal",
        "fecha": date.today().isoformat(),
        "cantidad": 50,
        "unidad_medida": "kilogramos",
    }
    base.update(cambios)
    return {k: v for k, v in base.items() if v is not None}


# ------------------------------------------------------------------ registro


def test_registrar_lote_con_producto_nuevo(session: Session) -> None:
    respuesta = client.post("/lotes/", json=_lote())

    assert respuesta.status_code == status.HTTP_201_CREATED
    cuerpo = respuesta.json()
    assert cuerpo["codigo"] == f"L-{date.today():%Y%m%d}-01"
    assert cuerpo["producto"]["nombre"] == "Pan lactal"
    assert cuerpo["cantidad"] == 50
    assert cuerpo["unidad_medida"] == "kilogramos"
    assert cuerpo["responsable_legajo"] == 1
    assert cuerpo["nombre_responsable"] == "Juan Perez"


def test_registrar_lote_con_producto_existente(session: Session) -> None:
    producto_id = client.post("/lotes/", json=_lote()).json()["producto"]["id"]

    respuesta = client.post("/lotes/", json=_lote(producto_nombre=None, producto_id=producto_id))

    assert respuesta.status_code == status.HTTP_201_CREATED
    assert respuesta.json()["producto"]["id"] == producto_id
    assert respuesta.json()["codigo"].endswith("-02")
    assert len(client.get("/productos/").json()) == 1


def test_producto_inexistente(session: Session) -> None:
    respuesta = client.post("/lotes/", json=_lote(producto_nombre=None, producto_id=999))
    assert respuesta.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.parametrize("campo", ["fecha", "cantidad", "unidad_medida"])
def test_faltan_datos_obligatorios(session: Session, campo: str) -> None:
    respuesta = client.post("/lotes/", json=_lote(**{campo: None}))
    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_falta_el_producto(session: Session) -> None:
    respuesta = client.post("/lotes/", json=_lote(producto_nombre=None))
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


def test_producto_existente_y_nuevo_a_la_vez(session: Session) -> None:
    respuesta = client.post("/lotes/", json=_lote(producto_id=1))
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.parametrize("cantidad", [0, -5])
def test_la_cantidad_debe_ser_mayor_a_cero(session: Session, cantidad: float) -> None:
    respuesta = client.post("/lotes/", json=_lote(cantidad=cantidad))
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == "La cantidad producida debe ser mayor a cero."


def test_la_fecha_no_puede_ser_futura(session: Session) -> None:
    manana = (date.today() + timedelta(days=1)).isoformat()
    respuesta = client.post("/lotes/", json=_lote(fecha=manana))
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


def test_unidad_de_medida_invalida(session: Session) -> None:
    respuesta = client.post("/lotes/", json=_lote(unidad_medida="toneladas"))
    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_un_lote_invalido_no_crea_el_producto(session: Session) -> None:
    client.post("/lotes/", json=_lote(producto_nombre="Producto fantasma", cantidad=0))
    assert client.get("/productos/").json() == []


# ------------------------------------------------------------------ consultas


def test_leer_lote(session: Session) -> None:
    creado = client.post("/lotes/", json=_lote()).json()

    respuesta = client.get(f"/lotes/{creado['id']}")
    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["codigo"] == creado["codigo"]
    assert client.get("/lotes/999").status_code == status.HTTP_404_NOT_FOUND


def test_listar_lotes_con_filtros(session: Session) -> None:
    hoy = date.today()
    pan = client.post("/lotes/", json=_lote(fecha=(hoy - timedelta(days=3)).isoformat())).json()
    tarta = client.post("/lotes/", json=_lote(producto_nombre="Tarta", fecha=hoy.isoformat())).json()

    todos = client.get("/lotes/").json()
    assert [l["id"] for l in todos] == [tarta["id"], pan["id"]]

    por_producto = client.get("/lotes/", params={"producto_id": pan["producto"]["id"]}).json()
    assert [l["id"] for l in por_producto] == [pan["id"]]

    desde = client.get("/lotes/", params={"desde": (hoy - timedelta(days=1)).isoformat()}).json()
    assert [l["id"] for l in desde] == [tarta["id"]]

    invalido = client.get("/lotes/", params={"desde": hoy.isoformat(), "hasta": (hoy - timedelta(days=1)).isoformat()})
    assert invalido.status_code == status.HTTP_400_BAD_REQUEST


def test_listar_productos(session: Session) -> None:
    client.post("/lotes/", json=_lote(producto_nombre="Tarta"))
    client.post("/lotes/", json=_lote(producto_nombre="Alfajor"))

    respuesta = client.get("/productos/")
    assert respuesta.status_code == status.HTTP_200_OK
    assert [p["nombre"] for p in respuesta.json()] == ["Alfajor", "Tarta"]


# ------------------------------------------------------------------ permisos


def test_sin_token_no_se_puede_entrar(usuarios: Dict[str, Personal]) -> None:
    assert client.post("/lotes/", json=_lote()).status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/lotes/").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/lotes/1").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/productos/").status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("rol", ["operador", "ambos"])
def test_operador_y_ambos_registran_lotes_con_su_legajo(usuarios: Dict[str, Personal], rol: str) -> None:
    persona = usuarios[rol]
    respuesta = client.post("/lotes/", json=_lote(), headers=headers(persona))

    assert respuesta.status_code == status.HTTP_201_CREATED
    assert respuesta.json()["responsable_legajo"] == persona.legajo


def test_un_administrador_puro_no_puede_registrar_lotes(usuarios: Dict[str, Personal]) -> None:
    respuesta = client.post("/lotes/", json=_lote(), headers=headers(usuarios["administrador"]))
    assert respuesta.status_code == status.HTTP_403_FORBIDDEN
    assert client.get("/productos/", headers=headers(usuarios["administrador"])).json() == []


@pytest.mark.parametrize("rol", ["operador", "administrador", "ambos"])
def test_cualquier_usuario_logueado_puede_consultar(usuarios: Dict[str, Personal], rol: str) -> None:
    cabeceras = headers(usuarios[rol])
    creado = client.post("/lotes/", json=_lote(), headers=headers(usuarios["operador"])).json()

    assert client.get("/lotes/", headers=cabeceras).status_code == status.HTTP_200_OK
    assert client.get(f"/lotes/{creado['id']}", headers=cabeceras).status_code == status.HTTP_200_OK
    assert client.get("/productos/", headers=cabeceras).status_code == status.HTTP_200_OK
