import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from fastapi import status
from tests.database import app, session
from src.insumos import services, schemas, exceptions
from src.insumos.models import Insumo, AlimentoReferenciaSARA
from src.insumos.constants import (
    FUENTE_SARA_2,
    FUENTE_ROTULO_PROVEEDOR,
    FUENTE_OTRA_BIBLIOGRAFIA,
    FUENTE_VALOR_PROPIO,
)

client = TestClient(app)

def test_buscar_alimentos_sara(session: Session) -> None:
    res = client.get("/insumos/referencia-sara?busqueda=harina")
    assert res.status_code == status.HTTP_200_OK
    items = res.json()
    assert len(items) >= 2
    assert any("Harina" in i["nombre"] for i in items)

def test_buscar_alimentos_sara_categoria(session: Session) -> None:
    res = client.get("/insumos/referencia-sara?categoria=Grasas y aceites")
    assert res.status_code == status.HTTP_200_OK
    items = res.json()
    assert len(items) >= 3
    assert all(i["categoria"] == "Grasas y aceites" for i in items)

def test_obtener_alimento_sara_por_codigo(session: Session) -> None:
    res = client.get("/insumos/referencia-sara/SARA-001")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["codigo"] == "SARA-001"
    assert data["nombre"] == "Harina de trigo común 000"
    assert data["energia_kcal"] == 346.0

def test_obtener_alimento_sara_no_encontrado(session: Session) -> None:
    res = client.get("/insumos/referencia-sara/SARA-99999")
    assert res.status_code == status.HTTP_404_NOT_FOUND

def test_obtener_nutricion_insumo_vacio(session: Session) -> None:
    res = client.get("/insumos/1/nutricion")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["insumo_id"] == 1
    assert data["tiene_datos_cargados"] is False
    assert data["modificado_manualmente"] is False

def test_guardar_nutricion_desde_sara_sin_modificar(session: Session) -> None:
    datos = {
        "es_aditivo": False,
        "fuente_datos": FUENTE_SARA_2,
        "fuente_detalle": "Base SARA 2",
        "alimento_referencia_id": "SARA-001",
        "energia_kcal": 346.0,
        "energia_kj": 1448.0,
        "carbohidratos": 72.8,
        "azucares_totales": 1.1,
        "azucares_anadidos": 0.0,
        "proteinas": 10.3,
        "grasas_totales": 1.2,
        "grasas_saturadas": 0.3,
        "grasas_trans": 0.0,
        "fibra_alimentaria": 3.2,
        "sodio_mg": 2.0,
    }
    res = client.put("/insumos/1/nutricion", json=datos)
    assert res.status_code == status.HTTP_200_OK
    res_data = res.json()
    assert res_data["tiene_datos_cargados"] is True
    assert res_data["modificado_manualmente"] is False
    assert len(res_data["campos_modificados"]) == 0
    assert res_data["fuente_datos"] == FUENTE_SARA_2
    assert res_data["alimento_referencia_id"] == "SARA-001"
    assert res_data["fecha_carga_nutricional"] is not None

def test_guardar_nutricion_desde_sara_modificado(session: Session) -> None:
    datos = {
        "es_aditivo": False,
        "fuente_datos": FUENTE_SARA_2,
        "fuente_detalle": "Base SARA 2",
        "alimento_referencia_id": "SARA-001",
        "energia_kcal": 346.0,
        "energia_kj": 1448.0,
        "carbohidratos": 70.0,
        "azucares_totales": 1.1,
        "azucares_anadidos": 0.0,
        "proteinas": 12.0,
        "grasas_totales": 1.2,
        "grasas_saturadas": 0.3,
        "grasas_trans": 0.0,
        "fibra_alimentaria": 3.2,
        "sodio_mg": 15.0,
    }
    res = client.put("/insumos/1/nutricion", json=datos)
    assert res.status_code == status.HTTP_200_OK
    res_data = res.json()
    assert res_data["modificado_manualmente"] is True
    assert "carbohidratos" in res_data["campos_modificados"]
    assert "proteinas" in res_data["campos_modificados"]
    assert "sodio_mg" in res_data["campos_modificados"]
    assert res_data["fecha_modificacion_nutricional"] is not None
    assert res_data["usuario_modificacion_nutricional"] is not None

def test_guardar_nutricion_rotulo_proveedor(session: Session) -> None:
    datos = {
        "es_aditivo": False,
        "fuente_datos": FUENTE_ROTULO_PROVEEDOR,
        "fuente_detalle": "Rótulo proveedor Lote 45",
        "energia_kcal": 884.0,
        "energia_kj": 3699.0,
        "carbohidratos": 0.0,
        "azucares_totales": 0.0,
        "azucares_anadidos": 0.0,
        "proteinas": 0.0,
        "grasas_totales": 100.0,
        "grasas_saturadas": 11.0,
        "grasas_trans": 0.0,
        "fibra_alimentaria": 0.0,
        "sodio_mg": 0.0,
    }
    res = client.put("/insumos/2/nutricion", json=datos)
    assert res.status_code == status.HTTP_200_OK
    res_data = res.json()
    assert res_data["fuente_datos"] == FUENTE_ROTULO_PROVEEDOR
    assert res_data["modificado_manualmente"] is False
    assert res_data["grasas_totales"] == 100.0

def test_validacion_valores_negativos(session: Session) -> None:
    datos = {
        "es_aditivo": False,
        "fuente_datos": FUENTE_VALOR_PROPIO,
        "energia_kcal": -100.0,
        "carbohidratos": 10.0,
        "proteinas": 5.0,
        "grasas_totales": 2.0,
        "sodio_mg": 5.0,
    }
    res = client.put("/insumos/1/nutricion", json=datos)
    assert res.status_code == status.HTTP_400_BAD_REQUEST

def test_validacion_fuente_requerida(session: Session) -> None:
    datos = {
        "es_aditivo": False,
        "fuente_datos": "INVALID_FUENTE",
        "energia_kcal": 100.0,
        "carbohidratos": 10.0,
        "proteinas": 5.0,
        "grasas_totales": 2.0,
        "sodio_mg": 5.0,
    }
    res = client.put("/insumos/1/nutricion", json=datos)
    assert res.status_code == status.HTTP_400_BAD_REQUEST

def test_validacion_nutrientes_requeridos_ingrediente(session: Session) -> None:
    datos = {
        "es_aditivo": False,
        "fuente_datos": FUENTE_ROTULO_PROVEEDOR,
        "energia_kcal": 100.0,
    }
    res = client.put("/insumos/1/nutricion", json=datos)
    assert res.status_code == status.HTTP_400_BAD_REQUEST

def test_validacion_aditivo_opcional(session: Session) -> None:
    datos = {
        "es_aditivo": True,
        "fuente_datos": FUENTE_ROTULO_PROVEEDOR,
        "fuente_detalle": "Rótulo bicarbonato",
        "energia_kcal": 0.0,
        "sodio_mg": 27360.0,
    }
    res = client.put("/insumos/1/nutricion", json=datos)
    assert res.status_code == status.HTTP_200_OK
    res_data = res.json()
    assert res_data["es_aditivo"] is True
    assert res_data["sodio_mg"] == 27360.0
    assert res_data["carbohidratos"] is None
    assert res_data["proteinas"] is None

def test_calculo_automatico_kj_desde_kcal(session: Session) -> None:
    datos = {
        "es_aditivo": False,
        "fuente_datos": FUENTE_VALOR_PROPIO,
        "energia_kcal": 200.0,
        "carbohidratos": 30.0,
        "proteinas": 5.0,
        "grasas_totales": 2.0,
        "sodio_mg": 10.0,
    }
    res = client.put("/insumos/1/nutricion", json=datos)
    assert res.status_code == status.HTTP_200_OK
    res_data = res.json()
    assert res_data["energia_kj"] == round(200.0 * 4.184, 1)
