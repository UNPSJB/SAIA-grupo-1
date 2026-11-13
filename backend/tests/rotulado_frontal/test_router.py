import copy
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.autenticacion.dependencies import get_usuario_actual
from src.main import app
from src.personal.schemas import Capacidades
from src.rotulado_frontal.constants import PARAMETROS_INICIALES
from tests.database import USUARIO_DE_PRUEBA, session

client = TestClient(app)
BASE = "/rotulado-frontal"

# 30 g de azucares en 400 kcal = 30 % de la energia; 400 kcal/100 g supera el umbral de calorias
VALORES_ALFAJOR = {
    "energia_kcal": 400, "azucares_anadidos": 30, "grasas_totales": 5, "grasas_saturadas": 1, "sodio_mg": 100,
}


def payload_conjunto(version: str, fecha: str, umbral_azucares: float = 10) -> dict:
    datos = copy.deepcopy(PARAMETROS_INICIALES)
    datos.update(version=version, fecha_vigencia=fecha)
    datos["reglas"][0]["condiciones"][0]["umbral"] = umbral_azucares
    return datos


def crear_y_publicar(version: str, fecha: str, **kwargs) -> dict:
    res = client.post(f"{BASE}/parametros", json=payload_conjunto(version, fecha, **kwargs))
    assert res.status_code == 201, res.text
    res = client.post(f"{BASE}/parametros/{res.json()['id']}/publicar")
    assert res.status_code == 200, res.text
    return res.json()


def crear_producto(nombre: str = "Alfajor", unidad: str = "gramos") -> int:
    res = client.post("/productos/", json={"nombre": nombre, "unidadMedida": unidad})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def calcular(producto_id: int, valores: dict = VALORES_ALFAJOR):
    return client.post(f"{BASE}/productos/{producto_id}/calculos", json={"valores": valores})


@pytest.fixture
def como_usuario():
    """Permite cambiar el usuario logueado dentro de un test y lo restaura al final."""
    def _cambiar(capacidad: Capacidades):
        app.dependency_overrides[get_usuario_actual] = lambda: SimpleNamespace(
            legajo=99, capacidad=capacidad, activo=True,
        )
    yield _cambiar
    app.dependency_overrides[get_usuario_actual] = lambda: USUARIO_DE_PRUEBA


# --- Validaciones de version, fecha de vigencia y norma de origen ---

@pytest.mark.parametrize("campo", ["version", "fecha_vigencia", "norma_origen"])
def test_no_se_crea_un_conjunto_sin_campo_obligatorio(session: Session, campo: str) -> None:
    payload = payload_conjunto("v1", "2020-01-01")
    del payload[campo]
    assert client.post(f"{BASE}/parametros", json=payload).status_code == 422


@pytest.mark.parametrize("campo", ["version", "norma_origen"])
def test_no_se_crea_un_conjunto_con_campo_en_blanco(session: Session, campo: str) -> None:
    payload = payload_conjunto("v1", "2020-01-01")
    payload[campo] = "   "
    assert client.post(f"{BASE}/parametros", json=payload).status_code == 422


def test_no_se_permite_version_duplicada(session: Session) -> None:
    crear_y_publicar("v1", "2020-01-01")
    res = client.post(f"{BASE}/parametros", json=payload_conjunto("v1", "2021-01-01"))
    assert res.status_code == 409


def test_codigos_de_regla_repetidos_dan_422(session: Session) -> None:
    payload = payload_conjunto("v1", "2020-01-01")
    payload["reglas"].append(copy.deepcopy(payload["reglas"][0]))
    assert client.post(f"{BASE}/parametros", json=payload).status_code == 422


# --- Ciclo de vida: borrador -> publicado ---

def test_flujo_completo_de_versionado(session: Session) -> None:
    res = client.post(f"{BASE}/parametros", json=payload_conjunto("v1", "2020-01-01"))
    assert res.status_code == 201
    borrador = res.json()
    assert borrador["estado"] == "BORRADOR"
    assert borrador["norma_origen"] == PARAMETROS_INICIALES["norma_origen"]
    assert len(borrador["reglas"]) == 5

    # un borrador se puede editar
    editado = payload_conjunto("v1", "2020-01-01", umbral_azucares=12)
    editado["descripcion"] = "Ajuste de azúcares"
    res = client.put(f"{BASE}/parametros/{borrador['id']}", json=editado)
    assert res.status_code == 200
    assert res.json()["reglas"][0]["condiciones"][0]["umbral"] == 12

    res = client.post(f"{BASE}/parametros/{borrador['id']}/publicar")
    assert res.status_code == 200
    assert res.json()["estado"] == "PUBLICADO"
    assert res.json()["es_vigente"] is True

    res = client.get(f"{BASE}/parametros/vigente")
    assert res.status_code == 200 and res.json()["version"] == "v1"

    res = client.post(
        f"{BASE}/parametros/{borrador['id']}/nueva-version",
        json={"version": "v2", "fecha_vigencia": "2021-01-01", "norma_origen": "Resolución 2021"},
    )
    assert res.status_code == 201
    assert res.json()["basado_en_id"] == borrador["id"]

    listado = client.get(f"{BASE}/parametros").json()
    assert [c["version"] for c in listado] == ["v2", "v1"]
    assert client.get(f"{BASE}/parametros", params={"estado": "BORRADOR"}).json()[0]["version"] == "v2"


def test_un_conjunto_publicado_no_se_edita_ni_se_borra(session: Session) -> None:
    publicado = crear_y_publicar("v1", "2020-01-01")
    res = client.put(f"{BASE}/parametros/{publicado['id']}", json=payload_conjunto("v1", "2020-01-01", 50))
    assert res.status_code == 409
    assert client.delete(f"{BASE}/parametros/{publicado['id']}").status_code == 409
    assert client.post(f"{BASE}/parametros/{publicado['id']}/publicar").status_code == 409


def test_un_borrador_se_puede_eliminar(session: Session) -> None:
    res = client.post(f"{BASE}/parametros", json=payload_conjunto("v1", "2020-01-01"))
    conjunto_id = res.json()["id"]
    assert client.delete(f"{BASE}/parametros/{conjunto_id}").status_code == 204
    assert client.get(f"{BASE}/parametros/{conjunto_id}").status_code == 404


def test_evaluar_un_borrador_sin_guardar(session: Session) -> None:
    res = client.post(f"{BASE}/parametros", json=payload_conjunto("v1", "2020-01-01", umbral_azucares=50))
    res = client.post(f"{BASE}/evaluar", json={
        "valores": VALORES_ALFAJOR, "estado_fisico": "SOLIDO", "conjunto_id": res.json()["id"],
    })
    assert res.status_code == 200
    assert res.json()["sellos"] == ["EXCESO_CALORIAS"]


# --- No alterar calculos historicos ---

def test_publicar_parametros_nuevos_no_altera_calculos_anteriores(session: Session) -> None:
    crear_y_publicar("v1", "2020-01-01", umbral_azucares=10)
    producto_id = crear_producto()

    primero = calcular(producto_id)
    assert primero.status_code == 201, primero.text
    assert primero.json()["version_parametros"] == "v1"
    assert "EXCESO_AZUCARES" in primero.json()["sellos"]

    # la norma cambia: el umbral de azucares sube al 50 %
    crear_y_publicar("v2", "2021-01-01", umbral_azucares=50)
    segundo = calcular(producto_id)
    assert segundo.json()["version_parametros"] == "v2"
    assert "EXCESO_AZUCARES" not in segundo.json()["sellos"]

    historial = client.get(f"{BASE}/productos/{producto_id}/calculos").json()
    assert [c["version_parametros"] for c in historial] == ["v2", "v1"]
    viejo = historial[1]
    assert viejo["id"] == primero.json()["id"]
    assert viejo["sellos"] == primero.json()["sellos"]
    assert viejo["detalle"] == primero.json()["detalle"]
    assert viejo["valores_entrada"] == VALORES_ALFAJOR

    ultimo = client.get(f"{BASE}/productos/{producto_id}/calculos/ultimo").json()
    assert ultimo["id"] == segundo.json()["id"]

    v1 = next(c for c in client.get(f"{BASE}/parametros").json() if c["version"] == "v1")
    assert v1["cantidad_calculos"] == 1


def test_calcular_sin_parametros_vigentes_da_409(session: Session) -> None:
    producto_id = crear_producto()
    assert calcular(producto_id).status_code == 409


def test_calcular_producto_inexistente_da_404(session: Session) -> None:
    crear_y_publicar("v1", "2020-01-01")
    assert calcular(9999).status_code == 404


def test_ultimo_calculo_sin_calculos_da_404(session: Session) -> None:
    producto_id = crear_producto()
    assert client.get(f"{BASE}/productos/{producto_id}/calculos/ultimo").status_code == 404


# --- Interruptor del modulo ---

def test_desactivar_el_modulo_no_afecta_al_resto(session: Session) -> None:
    crear_y_publicar("v1", "2020-01-01")
    producto_id = crear_producto()
    assert calcular(producto_id).status_code == 201

    res = client.put(f"{BASE}/modulo", json={"activo": False})
    assert res.status_code == 200 and res.json()["activo"] is False
    assert client.get(f"{BASE}/modulo").json()["activo"] is False

    # los endpoints de octogonos quedan cortados
    assert calcular(producto_id).status_code == 409
    assert client.get(f"{BASE}/productos/{producto_id}/calculos").status_code == 409

    # la pantalla de parametros sigue disponible, para poder volver a activarlo
    assert client.get(f"{BASE}/parametros").status_code == 200

    # el resto de la aplicacion responde igual
    assert client.get("/productos/").status_code == 200
    assert client.get(f"/productos/{producto_id}").status_code == 200
    assert client.get("/insumos/").status_code == 200

    # al reactivarlo no se perdio nada
    client.put(f"{BASE}/modulo", json={"activo": True})
    assert len(client.get(f"{BASE}/productos/{producto_id}/calculos").json()) == 1


# --- Acceso solo para administradores ---

def test_un_operador_no_accede_a_los_parametros(session: Session, como_usuario) -> None:
    como_usuario(Capacidades.OPERAR)
    assert client.get(f"{BASE}/parametros").status_code == 403
    assert client.post(f"{BASE}/parametros", json=payload_conjunto("v1", "2020-01-01")).status_code == 403
    assert client.put(f"{BASE}/modulo", json={"activo": False}).status_code == 403
    assert client.post(f"{BASE}/productos/1/calculos", json={"valores": VALORES_ALFAJOR}).status_code == 403
    # consultar si el modulo esta activo alcanza con estar logueado
    assert client.get(f"{BASE}/modulo").status_code == 200


def test_un_administrador_accede(session: Session, como_usuario) -> None:
    como_usuario(Capacidades.ADMINISTRAR)
    assert client.get(f"{BASE}/parametros").status_code == 200
