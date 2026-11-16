from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.insumos.models import Insumo, UnidadMedida
from src.main import app
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.produccion.models import InsumoLote, LoteProduccion
from src.producto.models import Producto
from src.rotulado.models import FormatoDeclaracionAditivos
from tests.database import session

client = TestClient(app)


def crear_producto_aux(session: Session, nombre: str = "Torta Router Test") -> Producto:
    prod = Producto(
        nombre=nombre,
        unidadMedida=UnidadMedida.KILOGRAMOS,
        activo=True,
    )
    session.add(prod)
    session.commit()
    session.refresh(prod)
    return prod


def test_guardar_y_obtener_ingredientes_rotulo_router(session: Session):
    prod = crear_producto_aux(session, "Galletas Router Test")

    get_404 = client.get(f"/productos/{prod.id}/ingredientes-rotulo")
    assert get_404.status_code == 404

    payload = {
        "formato_aditivos": "ins_y_nombre",
        "ajustado_manualmente": False,
        "items": [
            {
                "nombre": "Agua",
                "denominacion_rotulo": "Agua potable",
                "porcentaje": 30.0,
                "es_aditivo": False,
            },
            {
                "nombre": "Harina",
                "denominacion_rotulo": "Harina de trigo",
                "porcentaje": 69.0,
                "es_aditivo": False,
            },
            {
                "nombre": "Sorbato",
                "denominacion_rotulo": "Sorbato de potasio",
                "porcentaje": 1.0,
                "es_aditivo": True,
                "funcion": "Conservante",
                "numero_ins": "202",
            },
        ],
    }

    res_post = client.post(f"/productos/{prod.id}/ingredientes-rotulo", json=payload)
    assert res_post.status_code == 200
    data = res_post.json()
    assert data["producto_id"] == prod.id
    assert data["ajustado_manualmente"] is False
    assert len(data["items"]) == 3
    assert data["items"][0]["nombre"] == "Harina"
    assert data["items"][1]["nombre"] == "Agua"
    assert data["items"][2]["nombre"] == "Sorbato"

    res_get = client.get(f"/productos/{prod.id}/ingredientes-rotulo")
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["texto_rotulo"].startswith("INGREDIENTES: Harina de trigo, Agua potable, Conservante (INS 202 - Sorbato de potasio).")


def test_reordenar_y_restablecer_router(session: Session):
    prod = crear_producto_aux(session, "Pan Router Test")

    payload = {
        "formato_aditivos": "solo_ins",
        "ajustado_manualmente": False,
        "items": [
            {"nombre": "Harina", "porcentaje": 60.0, "es_aditivo": False},
            {"nombre": "Agua", "porcentaje": 38.0, "es_aditivo": False},
            {
                "nombre": "Lecitina",
                "porcentaje": 2.0,
                "es_aditivo": True,
                "funcion": "Emulsionante",
                "numero_ins": "322",
            },
        ],
    }
    res_crear = client.post(f"/productos/{prod.id}/ingredientes-rotulo", json=payload)
    assert res_crear.status_code == 200
    items = res_crear.json()["items"]
    ids = [items[2]["id"], items[0]["id"], items[1]["id"]]

    res_reorden = client.put(
        f"/productos/{prod.id}/ingredientes-rotulo/reordenar",
        json={"item_ids": ids},
    )
    assert res_reorden.status_code == 200
    data_reorden = res_reorden.json()
    assert data_reorden["ajustado_manualmente"] is True
    assert data_reorden["items"][0]["id"] == ids[0]
    assert data_reorden["usuario_ajuste_manual"] is not None

    res_restab = client.post(
        f"/productos/{prod.id}/ingredientes-rotulo/restablecer-automatico"
    )
    assert res_restab.status_code == 200
    data_restab = res_restab.json()
    assert data_restab["ajustado_manualmente"] is False
    assert data_restab["items"][0]["nombre"] == "Harina"


def test_cambiar_formato_router(session: Session):
    prod = crear_producto_aux(session, "Galletitas Formato Test")
    payload = {
        "formato_aditivos": "solo_ins",
        "ajustado_manualmente": False,
        "items": [
            {"nombre": "Harina", "porcentaje": 99.0, "es_aditivo": False},
            {
                "nombre": "Sorbato",
                "porcentaje": 1.0,
                "es_aditivo": True,
                "funcion": "Conservante",
                "numero_ins": "202",
            },
        ],
    }
    client.post(f"/productos/{prod.id}/ingredientes-rotulo", json=payload)

    patch_res = client.patch(
        f"/productos/{prod.id}/ingredientes-rotulo/formato",
        json={"formato_aditivos": "solo_nombre"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["formato_aditivos"] == "solo_nombre"
    assert "Conservante (Sorbato)" in patch_res.json()["texto_rotulo"]


def test_previsualizar_orden_router(session: Session):
    prod = crear_producto_aux(session, "Preview Test")
    payload = {
        "formato_aditivos": "ins_y_nombre",
        "items": [
            {"nombre": "Azúcar", "porcentaje": 20.0, "es_aditivo": False},
            {"nombre": "Leche", "porcentaje": 79.0, "es_aditivo": False},
            {
                "nombre": "Vainilla",
                "porcentaje": 1.0,
                "es_aditivo": True,
                "funcion": "Aromatizante",
                "numero_ins": "950",
                "es_aromatizante": True,
            },
        ],
    }
    res = client.post(f"/productos/{prod.id}/ingredientes-rotulo/previsualizar", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["items"][0]["nombre"] == "Leche"
    assert data["items"][1]["nombre"] == "Azúcar"
    assert data["items"][2]["texto_declaracion"] == "Aromatizante"


def test_importar_desde_lote_router(session: Session):
    prod = crear_producto_aux(session, "Lote Import Test")

    user = Personal(
        legajo=333,
        documento="99887766",
        nombre="Carlos",
        apellido="Tester",
        email="carlos@test.com",
        capacidad=Capacidades.ADMINISTRAR,
        activo=True,
        usuario="carlos",
    )
    session.add(user)

    ins1 = Insumo(
        nombre="Harina 0000",
        lote="LOT-01",
        fechaRecepcion=date.today(),
        cantRecibida=100.0,
        stock=100.0,
        medida=UnidadMedida.KILOGRAMOS,
    )
    session.add(ins1)
    session.commit()

    lote = LoteProduccion(
        codigo="L-TEST-IMPORT",
        producto_id=prod.id,
        fecha=date.today(),
        cantidad=50.0,
        responsable_legajo=user.legajo,
    )
    session.add(lote)
    session.commit()

    lote.insumos.append(InsumoLote(insumo_id=ins1.id, cantidad=50.0))
    session.commit()

    res = client.post(f"/productos/{prod.id}/ingredientes-rotulo/importar-lote")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["nombre"] == "Harina 0000"


def test_e13_endpoint_router(session: Session):
    prod = crear_producto_aux(session, "E13 Test Prod")

    res_antes = client.get(f"/rotulado/productos/{prod.id}/ingredientes")
    assert res_antes.status_code == 200
    assert res_antes.json()["disponible"] is False

    payload = {
        "formato_aditivos": "solo_ins",
        "items": [
            {"nombre": "Cacao", "porcentaje": 100.0, "es_aditivo": False},
        ],
    }
    client.post(f"/productos/{prod.id}/ingredientes-rotulo", json=payload)

    res_despues = client.get(f"/rotulado/productos/{prod.id}/ingredientes")
    assert res_despues.status_code == 200
    data = res_despues.json()
    assert data["disponible"] is True
    assert data["texto_rotulo"] == "INGREDIENTES: Cacao."
    assert len(data["items"]) == 1
