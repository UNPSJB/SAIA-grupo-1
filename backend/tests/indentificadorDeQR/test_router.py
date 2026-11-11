from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.indentificadorDeQR.schemas import IdentificadorQRCreate
from src.indentificadorDeQR.services import crear_IdentificadorUnico
from tests.database import app, session

client = TestClient(app)


def _qr(session: Session) -> str:
    return crear_IdentificadorUnico(session, IdentificadorQRCreate(), urldelQR="http://localhost/vista-publica").id_alfanumerico


def _producto(nombre: str) -> int:
    return client.post("/productos/", json={"nombre": nombre, "unidadMedida": "unidades", "descripcion": "Por unidad"}).json()["id"]


def test_catalogo_publico_completo(session: Session) -> None:
    qr = _qr(session)
    visible, oculto, de_baja = _producto("Sacramento"), _producto("Vigilante"), _producto("Cañoncito")
    client.put("/productos/visibilidad-publica", json={"productos_visibles": [visible, de_baja]})
    client.delete(f"/productos/{de_baja}")

    # con la seccion desactivada (por defecto) no se ve nada
    assert client.get(f"/identificadorQR/{qr}/productos").json() == []
    assert client.get(f"/identificadorQR/verificar/{qr}").json()["verProductos"] is False

    res = client.put(f"/identificadorQR/{qr}/ver-productos", json={"verProductos": True})
    assert res.status_code == 200
    assert res.json()["verProductos"] is True
    assert client.get(f"/identificadorQR/verificar/{qr}").json()["verProductos"] is True

    res = client.get(f"/identificadorQR/{qr}/productos")
    assert res.status_code == 200
    # solo el visible y activo, y sin datos internos como la receta
    assert res.json() == [{"id": visible, "nombre": "Sacramento", "descripcion": "Por unidad", "unidadMedida": "unidades", "unidad_medida_abreviatura": "UN"}]
    assert oculto not in [p["id"] for p in res.json()]


def test_catalogo_publico_qr_deshabilitado(session: Session) -> None:
    qr = _qr(session)
    client.put(f"/identificadorQR/{qr}/ver-productos", json={"verProductos": True})
    client.put(f"/identificadorQR/{qr}")  # desactiva la vista publica
    assert client.get(f"/identificadorQR/{qr}/productos").status_code == 400


def test_catalogo_publico_qr_inexistente(session: Session) -> None:
    assert client.get("/identificadorQR/no-existe/productos").status_code == 404
