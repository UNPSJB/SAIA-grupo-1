from datetime import datetime

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.recetas import schemas, services
from tests.database import app, session
from tests.recetas.test_composicion_porcentual import _preparar_base

client = TestClient(app)


def _crear_receta(session: Session, nombre: str = "Receta Export"):
    admin, operario, producto, t_harina, _, _, ins_harina, _, _ = _preparar_base(session)
    services.crear_receta(
        session,
        schemas.RecetaCreate(
            nombre=nombre,
            rendimiento_final=2.0,
            tiempo_maximo_dias=2,
            fecha_creacion=datetime.now(),
            id_producto=producto.id,
            operario_legajo=operario.legajo,
            detalles=[
                schemas.RecetaDetalleCreate(
                    nombre="Paso Harina",
                    ingrediente_id=ins_harina.id,
                    tipo_insumo_id=t_harina.id,
                    cantidad=1.0,
                    unidad_medida="kilogramos",
                    es_aditivo=False,
                    descripcion_pasos="Agregar harina.",
                ),
            ],
        ),
        usuario=admin,
    )
    return admin, operario, producto


def test_exportar_recetas_csv(session: Session):
    _crear_receta(session)

    res = client.get("/recetas/exportar-csv")

    assert res.status_code == status.HTTP_200_OK
    assert "text/csv" in res.headers["content-type"]
    assert 'filename="recetas.csv"' in res.headers["content-disposition"]
    assert "Nombre de la Receta" in res.text
    assert "Receta Export" in res.text
    assert "Operario Planta" in res.text


def test_exportar_recetas_csv_respeta_busqueda(session: Session):
    _crear_receta(session)

    res_con = client.get("/recetas/exportar-csv?busqueda=export")
    res_sin = client.get("/recetas/exportar-csv?busqueda=inexistente")

    assert "Receta Export" in res_con.text
    assert "Receta Export" not in res_sin.text
    assert "Nombre de la Receta" in res_sin.text


def test_exportar_recetas_csv_filtra_por_aditivos(session: Session):
    _crear_receta(session)

    res_con = client.get("/recetas/exportar-csv?aditivos=CON_ADITIVOS")
    res_sin = client.get("/recetas/exportar-csv?aditivos=SIN_ADITIVOS")

    assert "Receta Export" not in res_con.text
    assert "Receta Export" in res_sin.text


def test_exportar_recetas_pdf(session: Session):
    _crear_receta(session)

    res = client.get("/recetas/exportar-pdf")

    assert res.status_code == status.HTTP_200_OK
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")


def test_exportar_checklists_receta_csv_y_pdf(session: Session):
    admin, operario, producto = _crear_receta(session)
    services.generar_checklist_receta(
        session,
        schemas.ChecklistRecetaGenerar(
            responsable_legajo=operario.legajo,
            id_producto=producto.id,
            cantidad_objetivo=4.0,
        ),
    )

    res_csv = client.get("/recetas/checklist/exportar-csv")
    assert res_csv.status_code == status.HTTP_200_OK
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Receta Export" in res_csv.text
    assert "Operario Planta" in res_csv.text

    res_pdf = client.get("/recetas/checklist/exportar-pdf")
    assert res_pdf.status_code == status.HTTP_200_OK
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert res_pdf.content.startswith(b"%PDF")


def test_exportar_checklists_receta_filtra_por_estado(session: Session):
    _, operario, producto = _crear_receta(session)
    services.generar_checklist_receta(
        session,
        schemas.ChecklistRecetaGenerar(
            responsable_legajo=operario.legajo,
            id_producto=producto.id,
            cantidad_objetivo=4.0,
        ),
    )

    res_completado = client.get("/recetas/checklist/exportar-csv?estado=completado")
    res_pendiente = client.get("/recetas/checklist/exportar-csv?estado=pendiente")

    assert "Receta Export" not in res_completado.text
    assert "Receta Export" in res_pendiente.text
