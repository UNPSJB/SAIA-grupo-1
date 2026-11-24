from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.alergenos.models import Alergeno
from src.tipoInsumo.models import TipoInsumo
from tests.database import app, session

client = TestClient(app)


def _crear_alergenos(session: Session):
    gluten = Alergeno(nombre="Gluten", simbolo="/alergenos/gluten.png")
    lacteos = Alergeno(nombre="Lácteos", simbolo="/alergenos/lacteos.png")
    harina = TipoInsumo(
        nombre="Harina Alergeno Test",
        unidad_medida_id=1,
        cantidad_referencia=1.0,
        equivalencia_gramos=1000.0,
        activo=True,
    )
    harina.alergenos = [gluten]
    session.add_all([gluten, lacteos, harina])
    session.commit()


def test_exportar_alergenos_csv(session: Session):
    _crear_alergenos(session)

    res = client.get("/alergenos/exportar-csv")

    assert res.status_code == status.HTTP_200_OK
    assert "text/csv" in res.headers["content-type"]
    assert 'filename="alergenos.csv"' in res.headers["content-disposition"]
    assert "Nombre del Alérgeno" in res.text
    assert "Gluten" in res.text
    assert "Harina Alergeno Test" in res.text
    assert "Lácteos" in res.text


def test_exportar_alergenos_csv_respeta_busqueda(session: Session):
    _crear_alergenos(session)

    res = client.get("/alergenos/exportar-csv?busqueda=glut")

    assert "Gluten" in res.text
    assert "Lácteos" not in res.text


def test_exportar_alergenos_pdf(session: Session):
    _crear_alergenos(session)

    res = client.get("/alergenos/exportar-pdf")

    assert res.status_code == status.HTTP_200_OK
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
