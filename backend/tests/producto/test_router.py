from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.main import app
from tests.database import session

client = TestClient(app)


def test_crear_y_obtener_producto_api(session: Session) -> None:
  payload = {
      "nombre": "Bizcocho de Grasa",
      "descripcion": "Paquete por 200g",
      "unidadMedida": "gramos",
      "id_receta": None,
  }
  res = client.post("/productos/", json=payload)
  assert res.status_code == 201
  data = res.json()
  assert data["nombre"] == "Bizcocho de Grasa"
  assert data["activo"] is True
  prod_id = data["id"]

  # Obtener el producto creado
  get_res = client.get(f"/productos/{prod_id}")
  assert get_res.status_code == 200
  assert get_res.json()["nombre"] == "Bizcocho de Grasa"


def test_get_productos_listado(session: Session) -> None:
  res = client.get("/productos/")
  assert res.status_code == 200
  data = res.json()
  assert isinstance(data, list)


def test_delete_y_restaurar_producto_api(session: Session) -> None:
  # 1. Crear producto
  payload = {
      "nombre": "Factura de Crema",
      "descripcion": "Unidad",
      "unidadMedida": "unidades",
  }
  res_create = client.post("/productos/", json=payload)
  prod_id = res_create.json()["id"]

  # 2. DELETE /productos/{id} (baja lógica)
  del_res = client.delete(f"/productos/{prod_id}")
  assert del_res.status_code == 200
  assert del_res.json()["activo"] is False

  # Verificar mediante GET
  get_res = client.get(f"/productos/{prod_id}")
  assert get_res.status_code == 200
  assert get_res.json()["activo"] is False

  # 3. POST /productos/{id}/restaurar
  restore_res = client.post(f"/productos/{prod_id}/restaurar")
  assert restore_res.status_code == 200
  assert restore_res.json()["activo"] is True

  # Verificar nuevamente
  get_res2 = client.get(f"/productos/{prod_id}")
  assert get_res2.status_code == 200
  assert get_res2.json()["activo"] is True