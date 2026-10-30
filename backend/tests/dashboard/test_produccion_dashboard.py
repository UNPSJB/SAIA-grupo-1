from datetime import date
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.dashboard import services
from src.insumos.models import UnidadMedida
from src.produccion.models import LoteProduccion
from src.producto.models import Producto
from tests.database import app, session

client = TestClient(app)

def test_produccion_dashboard_vacio(session: Session) -> None:
    resultado = services.obtener_estadisticas_produccion(
        session, periodo="dia", hoy=date(2026, 10, 28)
    )
    assert resultado.periodo == "dia"
    assert resultado.total_lotes == 0
    assert resultado.total_cantidad == 0.0
    assert len(resultado.puntos) == 7
    dias_esperados = ["22/10", "23/10", "24/10", "25/10", "26/10", "27/10", "28/10"]
    for i, p in enumerate(resultado.puntos):
        assert p.nombre == dias_esperados[i]
        assert p.cantidad == 0.0
        assert p.lotes == 0

def test_produccion_dashboard_diario_con_datos(session: Session) -> None:
    prod = Producto(nombre="Pan Lactal Test", unidadMedida=UnidadMedida.UNIDADES, activo=True)
    session.add(prod)
    session.commit()
    session.refresh(prod)

    lote1 = LoteProduccion(
        codigo="L-20261026-01",
        producto_id=prod.id,
        fecha=date(2026, 10, 26),
        cantidad=25.0,
        responsable_legajo=1,
    )
    lote2 = LoteProduccion(
        codigo="L-20261028-01",
        producto_id=prod.id,
        fecha=date(2026, 10, 28),
        cantidad=15.0,
        responsable_legajo=1,
    )
    lote3 = LoteProduccion(
        codigo="L-20261028-02",
        producto_id=prod.id,
        fecha=date(2026, 10, 28),
        cantidad=10.0,
        responsable_legajo=1,
    )
    lote_fuera = LoteProduccion(
        codigo="L-20261019-01",
        producto_id=prod.id,
        fecha=date(2026, 10, 19),
        cantidad=100.0,
        responsable_legajo=1,
    )
    session.add_all([lote1, lote2, lote3, lote_fuera])
    session.commit()

    resultado = services.obtener_estadisticas_produccion(
        session, periodo="dia", hoy=date(2026, 10, 28)
    )
    assert resultado.total_lotes == 3
    assert resultado.total_cantidad == 50.0

    p_26 = next(p for p in resultado.puntos if p.nombre == "26/10")
    assert p_26.cantidad == 25.0
    assert p_26.lotes == 1

    p_28 = next(p for p in resultado.puntos if p.nombre == "28/10")
    assert p_28.cantidad == 25.0
    assert p_28.lotes == 2

    p_27 = next(p for p in resultado.puntos if p.nombre == "27/10")
    assert p_27.cantidad == 0.0
    assert p_27.lotes == 0

def test_produccion_dashboard_semanal_con_datos(session: Session) -> None:
    prod = Producto(nombre="Medialunas Semanal Test", unidadMedida=UnidadMedida.UNIDADES, activo=True)
    session.add(prod)
    session.commit()
    session.refresh(prod)

    lote_sem1 = LoteProduccion(
        codigo="L-20261005-01",
        producto_id=prod.id,
        fecha=date(2026, 10, 5),
        cantidad=50.0,
        responsable_legajo=1,
    )
    lote_sem3 = LoteProduccion(
        codigo="L-20261020-01",
        producto_id=prod.id,
        fecha=date(2026, 10, 20),
        cantidad=80.0,
        responsable_legajo=1,
    )
    lote_sem5 = LoteProduccion(
        codigo="L-20261027-01",
        producto_id=prod.id,
        fecha=date(2026, 10, 27),
        cantidad=40.0,
        responsable_legajo=1,
    )
    session.add_all([lote_sem1, lote_sem3, lote_sem5])
    session.commit()

    resultado = services.obtener_estadisticas_produccion(
        session, periodo="semana", hoy=date(2026, 10, 28)
    )
    assert resultado.total_lotes == 3
    assert resultado.total_cantidad == 170.0
    assert len(resultado.puntos) == 5

    p_sem1 = next(p for p in resultado.puntos if p.nombre == "04/10 al 10/10")
    assert p_sem1.cantidad == 50.0
    assert p_sem1.lotes == 1

    p_sem2 = next(p for p in resultado.puntos if p.nombre == "11/10 al 17/10")
    assert p_sem2.cantidad == 0.0
    assert p_sem2.lotes == 0

    p_sem3 = next(p for p in resultado.puntos if p.nombre == "18/10 al 24/10")
    assert p_sem3.cantidad == 80.0
    assert p_sem3.lotes == 1

    p_sem5 = next(p for p in resultado.puntos if p.nombre == "25/10 al 28/10")
    assert p_sem5.cantidad == 40.0
    assert p_sem5.lotes == 1

def test_produccion_dashboard_mensual_este_anio(session: Session) -> None:
    prod = Producto(nombre="Torta Mensual Test", unidadMedida=UnidadMedida.KILOGRAMOS, activo=True)
    session.add(prod)
    session.commit()
    session.refresh(prod)

    l_marzo = LoteProduccion(
        codigo="L-20260315-01",
        producto_id=prod.id,
        fecha=date(2026, 3, 15),
        cantidad=120.0,
        responsable_legajo=1,
    )
    l_julio = LoteProduccion(
        codigo="L-20260720-01",
        producto_id=prod.id,
        fecha=date(2026, 7, 20),
        cantidad=150.0,
        responsable_legajo=1,
    )
    l_octubre = LoteProduccion(
        codigo="L-20261010-01",
        producto_id=prod.id,
        fecha=date(2026, 10, 10),
        cantidad=90.0,
        responsable_legajo=1,
    )
    l_anio_pasado = LoteProduccion(
        codigo="L-20251210-01",
        producto_id=prod.id,
        fecha=date(2025, 12, 10),
        cantidad=300.0,
        responsable_legajo=1,
    )
    session.add_all([l_marzo, l_julio, l_octubre, l_anio_pasado])
    session.commit()

    resultado = services.obtener_estadisticas_produccion(
        session, periodo="mes", hoy=date(2026, 10, 28)
    )
    assert resultado.total_lotes == 3
    assert resultado.total_cantidad == 360.0
    assert len(resultado.puntos) == 10

    p_ene = next(p for p in resultado.puntos if p.nombre == "01/2026")
    assert p_ene.cantidad == 0.0
    assert p_ene.lotes == 0

    p_mar = next(p for p in resultado.puntos if p.nombre == "03/2026")
    assert p_mar.cantidad == 120.0
    assert p_mar.lotes == 1

    p_jul = next(p for p in resultado.puntos if p.nombre == "07/2026")
    assert p_jul.cantidad == 150.0
    assert p_jul.lotes == 1

    p_oct = next(p for p in resultado.puntos if p.nombre == "10/2026")
    assert p_oct.cantidad == 90.0
    assert p_oct.lotes == 1
    assert resultado.puntos[-1].nombre == "10/2026"

def test_produccion_dashboard_filtro_producto(session: Session) -> None:
    p1 = Producto(nombre="Prod A", unidadMedida=UnidadMedida.UNIDADES, activo=True)
    p2 = Producto(nombre="Prod B", unidadMedida=UnidadMedida.UNIDADES, activo=True)
    session.add_all([p1, p2])
    session.commit()
    session.refresh(p1)
    session.refresh(p2)

    l1 = LoteProduccion(
        codigo="L-20261028-10",
        producto_id=p1.id,
        fecha=date(2026, 10, 28),
        cantidad=10.0,
        responsable_legajo=1,
    )
    l2 = LoteProduccion(
        codigo="L-20261028-11",
        producto_id=p2.id,
        fecha=date(2026, 10, 28),
        cantidad=90.0,
        responsable_legajo=1,
    )
    session.add_all([l1, l2])
    session.commit()

    res_p1 = services.obtener_estadisticas_produccion(
        session, periodo="dia", producto_id=p1.id, hoy=date(2026, 10, 28)
    )
    assert res_p1.total_lotes == 1
    assert res_p1.total_cantidad == 10.0

    res_p2 = services.obtener_estadisticas_produccion(
        session, periodo="dia", producto_id=p2.id, hoy=date(2026, 10, 28)
    )
    assert res_p2.total_lotes == 1
    assert res_p2.total_cantidad == 90.0

def test_endpoint_dashboard_produccion(session: Session) -> None:
    res_dia = client.get("/dashboard/produccion?periodo=dia")
    assert res_dia.status_code == status.HTTP_200_OK
    data_dia = res_dia.json()
    assert data_dia["periodo"] == "dia"
    assert len(data_dia["puntos"]) == 7

    res_sem = client.get("/dashboard/produccion?periodo=semana")
    assert res_sem.status_code == status.HTTP_200_OK
    data_sem = res_sem.json()
    assert data_sem["periodo"] == "semana"
    assert len(data_sem["puntos"]) >= 4

    res_mes = client.get("/dashboard/produccion?periodo=mes")
    assert res_mes.status_code == status.HTTP_200_OK
    data_mes = res_mes.json()
    assert data_mes["periodo"] == "mes"
    assert len(data_mes["puntos"]) >= 1

def test_produccion_dashboard_semanal_hoy_domingo(session: Session) -> None:
    res = services.obtener_estadisticas_produccion(
        session, periodo="semana", hoy=date(2026, 10, 25)
    )
    assert len(res.puntos) == 5
    assert res.puntos[0].nombre == "01/10 al 03/10"
    assert res.puntos[1].nombre == "04/10 al 10/10"
    assert res.puntos[2].nombre == "11/10 al 17/10"
    assert res.puntos[3].nombre == "18/10 al 24/10"
    assert res.puntos[4].nombre == "25/10"
