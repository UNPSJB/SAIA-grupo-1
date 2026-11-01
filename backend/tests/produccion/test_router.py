from datetime import date, timedelta
from typing import Any, Dict
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.insumos.models import UnidadMedida
from src.personal.models import Personal
from src.producto.models import Producto
from tests.autenticacion.conftest import autenticacion_real, headers, usuarios  # noqa: F401  (son fixtures)
from tests.database import app, session  # noqa: F401  (session es una fixture)

client = TestClient(app)

# ids de los productos que crea la fixture `productos`
PAN, TARTA, DADO_DE_BAJA = 1, 2, 3


@pytest.fixture(autouse=True)
def productos(session: Session) -> None:
    """Productos como los da de alta el ABM de productos; el lote solo los referencia."""
    session.add_all([
        Producto(id=PAN, nombre="Pan lactal", unidadMedida=UnidadMedida.KILOGRAMOS),
        Producto(id=TARTA, nombre="Tarta", unidadMedida=UnidadMedida.UNIDADES),
        Producto(id=DADO_DE_BAJA, nombre="Budín", unidadMedida=UnidadMedida.UNIDADES, activo=False),
    ])
    session.commit()


def _lote(**cambios: Any) -> Dict[str, Any]:
    base: Dict[str, Any] = {"producto_id": PAN, "fecha": date.today().isoformat(), "cantidad": 50}
    base.update(cambios)
    return {k: v for k, v in base.items() if v is not None}


# ------------------------------------------------------------------ registro


def test_registrar_lote(session: Session) -> None:
    respuesta = client.post("/lotes/", json=_lote())

    assert respuesta.status_code == status.HTTP_201_CREATED
    cuerpo = respuesta.json()
    assert cuerpo["codigo"] == f"L-{date.today():%Y%m%d}-01"
    assert cuerpo["producto"] == {"id": PAN, "nombre": "Pan lactal", "unidadMedida": "kilogramos", "activo": True}
    assert cuerpo["cantidad"] == 50
    assert cuerpo["editable"] is True
    assert cuerpo["responsable_legajo"] == 1
    assert cuerpo["nombre_responsable"] == "Juan Perez"


def test_registrar_otro_lote_del_mismo_producto(session: Session) -> None:
    client.post("/lotes/", json=_lote())

    respuesta = client.post("/lotes/", json=_lote())

    assert respuesta.status_code == status.HTTP_201_CREATED
    assert respuesta.json()["producto"]["id"] == PAN
    assert respuesta.json()["codigo"].endswith("-02")
    # registrar lotes no crea productos
    assert len(client.get("/productos/").json()) == 3


def test_producto_inexistente(session: Session) -> None:
    respuesta = client.post("/lotes/", json=_lote(producto_id=999))
    assert respuesta.status_code == status.HTTP_404_NOT_FOUND


def test_producto_dado_de_baja(session: Session) -> None:
    respuesta = client.post("/lotes/", json=_lote(producto_id=DADO_DE_BAJA))
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == "El producto está dado de baja: no se le pueden registrar lotes."


@pytest.mark.parametrize("campo", ["producto_id", "fecha", "cantidad"])
def test_faltan_datos_obligatorios(session: Session, campo: str) -> None:
    respuesta = client.post("/lotes/", json=_lote(**{campo: None}))
    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_no_se_puede_crear_un_producto_desde_el_lote(session: Session) -> None:
    cuerpo = _lote(producto_id=None, producto_nombre="Producto fantasma", producto_unidad_medida="kilogramos")
    respuesta = client.post("/lotes/", json=cuerpo)
    assert respuesta.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert "Producto fantasma" not in [p["nombre"] for p in client.get("/productos/").json()]


@pytest.mark.parametrize("cantidad", [0, -5])
def test_la_cantidad_debe_ser_mayor_a_cero(session: Session, cantidad: float) -> None:
    respuesta = client.post("/lotes/", json=_lote(cantidad=cantidad))
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == "La cantidad producida debe ser mayor a cero."


def test_la_fecha_no_puede_ser_futura(session: Session) -> None:
    manana = (date.today() + timedelta(days=1)).isoformat()
    respuesta = client.post("/lotes/", json=_lote(fecha=manana))
    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST


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
    tarta = client.post("/lotes/", json=_lote(producto_id=TARTA, fecha=hoy.isoformat())).json()

    todos = client.get("/lotes/").json()
    assert [l["id"] for l in todos] == [tarta["id"], pan["id"]]

    por_producto = client.get("/lotes/", params={"producto_id": PAN}).json()
    assert [l["id"] for l in por_producto] == [pan["id"]]

    desde = client.get("/lotes/", params={"desde": (hoy - timedelta(days=1)).isoformat()}).json()
    assert [l["id"] for l in desde] == [tarta["id"]]

    hasta = client.get("/lotes/", params={"hasta": (hoy - timedelta(days=1)).isoformat()}).json()
    assert [l["id"] for l in hasta] == [pan["id"]]
    # el de hoy todavía se puede modificar; el de hace tres días ya es de solo lectura
    assert [l["editable"] for l in todos] == [True, False]

    invalido = client.get("/lotes/", params={"desde": hoy.isoformat(), "hasta": (hoy - timedelta(days=1)).isoformat()})
    assert invalido.status_code == status.HTTP_400_BAD_REQUEST
    assert invalido.json()["detail"] == "La fecha 'desde' no puede ser posterior a la fecha 'hasta'."


# ------------------------------------------------------------------ insumos del lote

HARINA, ACEITE = 1, 2  # del seed de tests: 80 kg y 35 l
CANTIDAD_INVALIDA = "La cantidad utilizada de cada insumo debe ser mayor a cero."


def _crear_lote() -> int:
    return client.post("/lotes/", json=_lote()).json()["id"]


def _insumos(*pares: tuple) -> Dict[str, Any]:
    return {"insumos": [{"insumo_id": i, "cantidad": c} for i, c in pares]}


def test_asociar_insumos(session: Session) -> None:
    lote_id = _crear_lote()

    respuesta = client.post(f"/lotes/{lote_id}/insumos", json=_insumos((HARINA, 12.5), (ACEITE, 2)))

    assert respuesta.status_code == status.HTTP_201_CREATED
    assert respuesta.json()["insumos"] == [
        {"insumo": {"id": HARINA, "nombre": "Harina de Trigo 000", "lote": "ING-HAR-001", "medida": "kilogramos"},
         "cantidad": 12.5},
        {"insumo": {"id": ACEITE, "nombre": "Aceite de Girasol", "lote": "ING-ACE-002", "medida": "litros"},
         "cantidad": 2},
    ]
    # el detalle y el listado de lotes también traen los insumos
    assert len(client.get(f"/lotes/{lote_id}").json()["insumos"]) == 2
    assert len(client.get("/lotes/").json()[0]["insumos"]) == 2
    stock = {i["id"]: i["stock"] for i in client.get("/lotes/insumos-disponibles").json()}
    assert (stock[HARINA], stock[ACEITE]) == (67.5, 33)


def test_un_lote_nuevo_no_tiene_insumos(session: Session) -> None:
    assert client.post("/lotes/", json=_lote()).json()["insumos"] == []


@pytest.mark.parametrize(
    "cuerpo, codigo, detalle",
    [
        ({"insumos": [{"insumo_id": HARINA}]}, status.HTTP_422_UNPROCESSABLE_CONTENT, None),
        (_insumos((HARINA, 0)), status.HTTP_400_BAD_REQUEST, CANTIDAD_INVALIDA),
        (_insumos((HARINA, -3)), status.HTTP_400_BAD_REQUEST, CANTIDAD_INVALIDA),
        (_insumos(), status.HTTP_400_BAD_REQUEST, "Debe indicar al menos un insumo."),
        (_insumos((HARINA, 1), (HARINA, 2)), status.HTTP_400_BAD_REQUEST,
         "No se puede indicar el mismo insumo más de una vez."),
        (_insumos((HARINA, 81)), status.HTTP_400_BAD_REQUEST,
         "La cantidad utilizada supera el stock disponible del insumo."),
        (_insumos((999, 1)), status.HTTP_404_NOT_FOUND, "El insumo no fue encontrado."),
    ],
)
def test_validaciones_al_asociar(session: Session, cuerpo: Dict[str, Any], codigo: int, detalle: str) -> None:
    respuesta = client.post(f"/lotes/{_crear_lote()}/insumos", json=cuerpo)
    assert respuesta.status_code == codigo
    if detalle:
        assert respuesta.json()["detail"] == detalle


def test_no_se_puede_asociar_dos_veces_el_mismo_insumo(session: Session) -> None:
    lote_id = _crear_lote()
    client.post(f"/lotes/{lote_id}/insumos", json=_insumos((HARINA, 1)))

    respuesta = client.post(f"/lotes/{lote_id}/insumos", json=_insumos((HARINA, 1)))

    assert respuesta.status_code == status.HTTP_400_BAD_REQUEST
    assert respuesta.json()["detail"] == "El insumo ya está asociado a este lote."


def test_asociar_a_un_lote_inexistente(session: Session) -> None:
    assert client.post("/lotes/999/insumos", json=_insumos((HARINA, 1))).status_code == status.HTTP_404_NOT_FOUND


def test_quitar_insumo(session: Session) -> None:
    lote_id = _crear_lote()
    client.post(f"/lotes/{lote_id}/insumos", json=_insumos((HARINA, 10)))

    respuesta = client.delete(f"/lotes/{lote_id}/insumos/{HARINA}")

    assert respuesta.status_code == status.HTTP_200_OK
    assert respuesta.json()["insumos"] == []
    harina = next(i for i in client.get("/lotes/insumos-disponibles").json() if i["id"] == HARINA)
    assert harina["stock"] == 80
    assert client.delete(f"/lotes/{lote_id}/insumos/{HARINA}").status_code == status.HTTP_404_NOT_FOUND


def test_un_lote_de_un_dia_anterior_es_de_solo_lectura(session: Session) -> None:
    cerrado = "El lote está cerrado: solo se pueden modificar los lotes del día."
    ayer = (date.today() - timedelta(days=1)).isoformat()
    lote_id = client.post("/lotes/", json=_lote(fecha=ayer)).json()["id"]

    asociar = client.post(f"/lotes/{lote_id}/insumos", json=_insumos((HARINA, 1)))
    quitar = client.delete(f"/lotes/{lote_id}/insumos/{HARINA}")

    assert (asociar.status_code, asociar.json()["detail"]) == (status.HTTP_400_BAD_REQUEST, cerrado)
    assert (quitar.status_code, quitar.json()["detail"]) == (status.HTTP_400_BAD_REQUEST, cerrado)
    assert client.get(f"/lotes/{lote_id}").json()["editable"] is False


# ------------------------------------------------------------------ permisos


def test_sin_token_no_se_puede_entrar(usuarios: Dict[str, Personal]) -> None:
    assert client.post("/lotes/", json=_lote()).status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/lotes/").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/lotes/1").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/productos/").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.get("/lotes/insumos-disponibles").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.post("/lotes/1/insumos", json=_insumos((HARINA, 1))).status_code == status.HTTP_401_UNAUTHORIZED
    assert client.delete(f"/lotes/1/insumos/{HARINA}").status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize("rol", ["operador", "ambos"])
def test_operador_y_ambos_registran_lotes_con_su_legajo(usuarios: Dict[str, Personal], rol: str) -> None:
    persona = usuarios[rol]
    respuesta = client.post("/lotes/", json=_lote(), headers=headers(persona))

    assert respuesta.status_code == status.HTTP_201_CREATED
    assert respuesta.json()["responsable_legajo"] == persona.legajo


def test_un_administrador_puro_no_puede_registrar_lotes(usuarios: Dict[str, Personal]) -> None:
    respuesta = client.post("/lotes/", json=_lote(), headers=headers(usuarios["administrador"]))
    assert respuesta.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("rol", ["operador", "administrador", "ambos"])
def test_cualquier_usuario_logueado_puede_consultar(usuarios: Dict[str, Personal], rol: str) -> None:
    cabeceras = headers(usuarios[rol])
    creado = client.post("/lotes/", json=_lote(), headers=headers(usuarios["operador"])).json()

    assert client.get("/lotes/", headers=cabeceras).status_code == status.HTTP_200_OK
    assert client.get(f"/lotes/{creado['id']}", headers=cabeceras).status_code == status.HTTP_200_OK
    assert client.get("/productos/", headers=cabeceras).status_code == status.HTTP_200_OK
    assert client.get("/lotes/insumos-disponibles", headers=cabeceras).status_code == status.HTTP_200_OK


def test_el_operador_lista_productos_pero_no_los_da_de_alta(usuarios: Dict[str, Personal]) -> None:
    # el formulario de lotes necesita los productos; el ABM sigue siendo de administradores
    operador = headers(usuarios["operador"])
    nuevo = {"nombre": "Medialunas", "unidadMedida": "unidades"}

    assert [p["id"] for p in client.get("/productos/", headers=operador).json()] == [DADO_DE_BAJA, TARTA, PAN]
    assert client.post("/productos/", json=nuevo, headers=operador).status_code == status.HTTP_403_FORBIDDEN
    assert client.delete(f"/productos/{PAN}", headers=operador).status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize("rol", ["operador", "ambos"])
def test_operador_y_ambos_asocian_y_quitan_insumos(usuarios: Dict[str, Personal], rol: str) -> None:
    cabeceras = headers(usuarios[rol])
    lote_id = client.post("/lotes/", json=_lote(), headers=cabeceras).json()["id"]

    asociar = client.post(f"/lotes/{lote_id}/insumos", json=_insumos((HARINA, 1)), headers=cabeceras)
    quitar = client.delete(f"/lotes/{lote_id}/insumos/{HARINA}", headers=cabeceras)

    assert asociar.status_code == status.HTTP_201_CREATED
    assert quitar.status_code == status.HTTP_200_OK


def test_un_administrador_puro_no_puede_asociar_ni_quitar_insumos(usuarios: Dict[str, Personal]) -> None:
    operador = headers(usuarios["operador"])
    admin = headers(usuarios["administrador"])
    lote_id = client.post("/lotes/", json=_lote(), headers=operador).json()["id"]
    client.post(f"/lotes/{lote_id}/insumos", json=_insumos((HARINA, 1)), headers=operador)

    asociar = client.post(f"/lotes/{lote_id}/insumos", json=_insumos((ACEITE, 1)), headers=admin)
    quitar = client.delete(f"/lotes/{lote_id}/insumos/{HARINA}", headers=admin)

    assert asociar.status_code == status.HTTP_403_FORBIDDEN
    assert quitar.status_code == status.HTTP_403_FORBIDDEN
