from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session

client = TestClient(app)


def test_router_crear_tipo_insumo(session: Session):
    res = client.post(
        "/insumos/tipos/",
        json={"nombre": "Dulce de Membrillo", "descripcion": "Pasta de fruta dulce"},
    )
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["nombre"] == "Dulce de Membrillo"
    assert data["descripcion"] == "Pasta de fruta dulce"
    assert data["activo"] is True
    assert "id" in data


def test_router_crear_tipo_insumo_duplicado_falla(session: Session):
    client.post("/insumos/tipos/", json={"nombre": "Semillas de Amapola"})
    res = client.post("/insumos/tipos/", json={"nombre": "  semillas  de amapola "})
    assert res.status_code == status.HTTP_400_BAD_REQUEST


def test_router_crear_tipo_insumo_invalido_falla(session: Session):
    res_vacio = client.post("/insumos/tipos/", json={"nombre": "   "})
    assert res_vacio.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_CONTENT)

    res_corto = client.post("/insumos/tipos/", json={"nombre": "x"})
    assert res_corto.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_CONTENT)


def test_router_listar_tipos_insumos(session: Session):
    client.post("/insumos/tipos/", json={"nombre": "Crema Pastelera"})
    client.post("/insumos/tipos/", json={"nombre": "Pastaflora"})

    res = client.get("/insumos/tipos/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert any(t["nombre"] == "Crema Pastelera" for t in data)


def test_router_listar_con_busqueda_y_filtro_activos(session: Session):
    res_crear = client.post("/insumos/tipos/", json={"nombre": "Chocolate Blanco"})
    tipo_id = res_crear.json()["id"]
    client.delete(f"/insumos/tipos/{tipo_id}")

    res_activos = client.get("/insumos/tipos/?solo_activos=true")
    assert res_activos.status_code == status.HTTP_200_OK
    assert all(t["id"] != tipo_id for t in res_activos.json())

    res_busqueda = client.get("/insumos/tipos/?busqueda=blanco")
    assert res_busqueda.status_code == status.HTTP_200_OK
    assert any(t["id"] == tipo_id for t in res_busqueda.json())


def test_router_obtener_tipo_insumo(session: Session):
    res_crear = client.post("/insumos/tipos/", json={"nombre": "Almíbar"})
    tipo_id = res_crear.json()["id"]

    res_get = client.get(f"/insumos/tipos/{tipo_id}")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.json()["id"] == tipo_id
    assert res_get.json()["nombre"] == "Almíbar"

    res_404 = client.get("/insumos/tipos/99999")
    assert res_404.status_code == status.HTTP_404_NOT_FOUND


def test_router_actualizar_tipo_insumo(session: Session):
    res_crear = client.post("/insumos/tipos/", json={"nombre": "Coco"})
    tipo_id = res_crear.json()["id"]

    res_put = client.put(
        f"/insumos/tipos/{tipo_id}",
        json={"nombre": "Coco Rallado", "descripcion": "Seco deshidratado"},
    )
    assert res_put.status_code == status.HTTP_200_OK
    data = res_put.json()
    assert data["nombre"] == "Coco Rallado"
    assert data["descripcion"] == "Seco deshidratado"


def test_router_eliminar_tipo_insumo(session: Session):
    res_crear = client.post("/insumos/tipos/", json={"nombre": "Colorante Rojo"})
    tipo_id = res_crear.json()["id"]

    res_del_logico = client.delete(f"/insumos/tipos/{tipo_id}")
    assert res_del_logico.status_code == status.HTTP_200_OK
    assert res_del_logico.json()["activo"] is False

    res_del_fisico = client.delete(f"/insumos/tipos/{tipo_id}?fisico=true")
    assert res_del_fisico.status_code == status.HTTP_200_OK

    res_check = client.get(f"/insumos/tipos/{tipo_id}")
    assert res_check.status_code == status.HTTP_404_NOT_FOUND


def test_router_exportar_csv(session: Session):
    client.post("/insumos/tipos/", json={"nombre": "Miel de Abejas"})
    res = client.get("/insumos/tipos/exportar-csv?busqueda=Miel")
    assert res.status_code == status.HTTP_200_OK
    assert "text/csv" in res.headers["content-type"]
    assert "Miel de Abejas" in res.text


def test_router_actualizar_tipo_insumo_invalido_falla(session: Session):
    res_crear = client.post("/insumos/tipos/", json={"nombre": "Gelatina Sin Sabor"})
    tipo_id = res_crear.json()["id"]

    res_vacio = client.put(f"/insumos/tipos/{tipo_id}", json={"nombre": "   "})
    assert res_vacio.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_CONTENT)

    res_corto = client.put(f"/insumos/tipos/{tipo_id}", json={"nombre": "G"})
    assert res_corto.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_CONTENT)


def test_router_detalle_y_restaurar_tipo_insumo(session: Session):
    res_crear = client.post("/insumos/tipos/", json={"nombre": "Nuez Pelada"})
    assert res_crear.status_code == status.HTTP_201_CREATED
    tipo_id = res_crear.json()["id"]

    res_detalle = client.get(f"/insumos/tipos/{tipo_id}/detalle")
    assert res_detalle.status_code == status.HTTP_200_OK
    det = res_detalle.json()
    assert "lotes_historicos" in det
    assert "lotes" in det
    assert det["lotes_historicos"] == []

    res_baja = client.delete(f"/insumos/tipos/{tipo_id}")
    assert res_baja.status_code == status.HTTP_200_OK
    assert res_baja.json()["activo"] is False

    res_rest = client.post(f"/insumos/tipos/{tipo_id}/restaurar")
    assert res_rest.status_code == status.HTTP_200_OK
    assert res_rest.json()["activo"] is True
