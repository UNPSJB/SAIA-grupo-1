import json
from datetime import date, datetime, timedelta
from types import SimpleNamespace
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.database import app, session
from src.autenticacion.dependencies import get_usuario_actual
from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem
from src.insumos_quimicos.constants import TipoQuimicoEnum, UnidadMedidaEnum
from src.insumos_quimicos.exceptions import RangoFechasInvalidoException
from src.insumos_quimicos.models import InsumoQuimico
from src.insumos_quimicos.schemas import InsumoQuimicoCreate
from src.insumos_quimicos.services import InsumoQuimicoService, obtener_historico_consumo
from src.personal.schemas import Capacidades
from src.tareas.models import Frecuencia

client = TestClient(app)


def test_rango_fechas_invalido(session: Session) -> None:
    desde = date(2026, 10, 20)
    hasta = date(2026, 10, 10)

    with pytest.raises(RangoFechasInvalidoException):
        obtener_historico_consumo(session, desde=desde, hasta=hasta)

    resp = client.get("/api/insumos-quimicos/historico-consumo?desde=2026-10-20&hasta=2026-10-10")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "desde" in resp.json()["detail"].lower()


def test_historico_consumo_acceso_denegado_operador(session: Session) -> None:
    usuario_operador = SimpleNamespace(legajo=2, capacidad=Capacidades.OPERAR, activo=True)
    app.dependency_overrides[get_usuario_actual] = lambda: usuario_operador
    try:
        resp = client.get("/api/insumos-quimicos/historico-consumo")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
    finally:
        app.dependency_overrides[get_usuario_actual] = lambda: SimpleNamespace(
            legajo=1, capacidad=Capacidades.AMBAS, activo=True
        )


def test_historico_consumo_periodo_vacio(session: Session) -> None:
    desde = date(2026, 1, 1)
    hasta = date(2026, 1, 10)

    resultado = obtener_historico_consumo(session, desde=desde, hasta=hasta)
    assert resultado.total_registros == 0
    assert resultado.metricas.consumo_total_periodo == 0.0
    assert resultado.metricas.variacion_porcentual == 0.0
    assert len(resultado.movimientos) == 0
    assert len(resultado.evolucion) == 0
    assert len(resultado.por_tipo) == 0
    assert len(resultado.por_proveedor) == 0


def test_historico_consumo_calculo_y_variacion(session: Session) -> None:
    q1 = InsumoQuimicoService.create(
        session,
        InsumoQuimicoCreate(
            nombre="Lavandina Concentrada Test",
            tipo=TipoQuimicoEnum.DESINFECTANTE,
            unidad_medida=UnidadMedidaEnum.LITROS,
            stock_actual=50.0,
            proveedor="Clorox Profesional",
        ),
    )
    q2 = InsumoQuimicoService.create(
        session,
        InsumoQuimicoCreate(
            nombre="Detergente Industrial Test",
            tipo=TipoQuimicoEnum.DETERGENTE,
            unidad_medida=UnidadMedidaEnum.LITROS,
            stock_actual=40.0,
            proveedor="Spartan Chemical",
        ),
    )

    hoy = date.today()
    desde = hoy - timedelta(days=3)
    hasta = hoy

    chk_act1 = Checklist(fecha=hoy, responsable_legajo=1, activo=True)
    item_act1 = ChecklistItem(
        nombre_plan="Plan Cocina",
        nombre_tarea="Desinfeccion pisos",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO,
        responsable_legajo=1,
        insumos_utilizados=json.dumps([
            {"id": q1.id, "nombre": q1.nombre, "cantidad": 5.0, "unidad": "L"},
            {"id": q2.id, "nombre": q2.nombre, "cantidad": 4.0, "unidad": "L"},
        ]),
        fecha_hora_fin=datetime.combine(hoy, datetime.min.time()) + timedelta(hours=10),
    )
    chk_act1.items.append(item_act1)

    chk_act2 = Checklist(fecha=hoy - timedelta(days=1), responsable_legajo=1, activo=True)
    item_act2 = ChecklistItem(
        nombre_plan="Plan Cuadra",
        nombre_tarea="Limpieza mesadas",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO,
        responsable_legajo=1,
        insumos_utilizados=json.dumps([
            {"id": q1.id, "nombre": q1.nombre, "cantidad": 5.0, "unidad": "L"},
        ]),
        fecha_hora_fin=datetime.combine(hoy - timedelta(days=1), datetime.min.time()) + timedelta(hours=11),
    )
    chk_act2.items.append(item_act2)

    chk_prev = Checklist(fecha=desde - timedelta(days=2), responsable_legajo=1, activo=True)
    item_prev = ChecklistItem(
        nombre_plan="Plan Salon",
        nombre_tarea="Sanitizacion",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO,
        responsable_legajo=1,
        insumos_utilizados=json.dumps([
            {"id": q1.id, "nombre": q1.nombre, "cantidad": 10.0, "unidad": "L"},
        ]),
        fecha_hora_fin=datetime.combine(desde - timedelta(days=2), datetime.min.time()) + timedelta(hours=8),
    )
    chk_prev.items.append(item_prev)

    session.add_all([chk_act1, chk_act2, chk_prev])
    session.commit()

    resultado = obtener_historico_consumo(session, desde=desde, hasta=hasta, unidad="L")

    assert resultado.total_registros == 3  # 2 en act1, 1 en act2
    assert resultado.metricas.consumo_total_periodo == 14.0
    assert resultado.metricas.consumo_periodo_anterior == 10.0
    assert resultado.metricas.variacion_porcentual == 40.0
    assert resultado.metricas.quimico_mas_consumido == q1.nombre
    assert resultado.metricas.cantidad_quimico_mas_consumido == 10.0

    tipos_dict = {t.clave: t.cantidad_total for t in resultado.por_tipo}
    assert tipos_dict["DESINFECTANTE"] == 10.0
    assert tipos_dict["DETERGENTE"] == 4.0

    provs_dict = {p.clave: p.cantidad_total for p in resultado.por_proveedor}
    assert provs_dict["Clorox Profesional"] == 10.0
    assert provs_dict["Spartan Chemical"] == 4.0

    assert len(resultado.movimientos) == 3
    assert resultado.movimientos[0].fecha >= resultado.movimientos[1].fecha

    assert len(resultado.evolucion) >= 2


def test_filtro_por_insumo_especifico(session: Session) -> None:
    q1 = InsumoQuimicoService.create(
        session,
        InsumoQuimicoCreate(
            nombre="Lavandina Exclusiva",
            tipo=TipoQuimicoEnum.DESINFECTANTE,
            unidad_medida=UnidadMedidaEnum.LITROS,
            stock_actual=20.0,
            proveedor="Proveedor A",
        ),
    )
    q2 = InsumoQuimicoService.create(
        session,
        InsumoQuimicoCreate(
            nombre="Desengrasante Exclusivo",
            tipo=TipoQuimicoEnum.DESENGRASANTE,
            unidad_medida=UnidadMedidaEnum.LITROS,
            stock_actual=20.0,
            proveedor="Proveedor B",
        ),
    )

    hoy = date.today()
    chk = Checklist(fecha=hoy, responsable_legajo=1, activo=True)
    item = ChecklistItem(
        nombre_plan="Plan General",
        nombre_tarea="Limpieza",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO,
        responsable_legajo=1,
        insumos_utilizados=json.dumps([
            {"id": q1.id, "nombre": q1.nombre, "cantidad": 3.0, "unidad": "L"},
            {"id": q2.id, "nombre": q2.nombre, "cantidad": 7.0, "unidad": "L"},
        ]),
    )
    chk.items.append(item)
    session.add(chk)
    session.commit()

    res_q1 = obtener_historico_consumo(session, desde=hoy, hasta=hoy, insumo_id=q1.id)
    assert res_q1.total_registros == 1
    assert res_q1.metricas.consumo_total_periodo == 3.0
    assert res_q1.movimientos[0].insumo_id == q1.id

    resp = client.get(f"/api/insumos-quimicos/historico-consumo?desde={hoy}&hasta={hoy}&insumo_id={q1.id}")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data["total_registros"] == 1
    assert data["metricas"]["consumo_total_periodo"] == 3.0


def test_agrupacion_tiempo_semana_y_mes(session: Session) -> None:
    q = InsumoQuimicoService.create(
        session,
        InsumoQuimicoCreate(
            nombre="Sanitizante Temporal",
            tipo=TipoQuimicoEnum.SANITIZANTE,
            unidad_medida=UnidadMedidaEnum.LITROS,
            stock_actual=50.0,
        ),
    )

    f1 = date(2026, 9, 14)  # Lunes
    f2 = date(2026, 9, 16)  # Miércoles misma semana
    f3 = date(2026, 9, 23)  # Semana siguiente

    chk1 = Checklist(fecha=f1, responsable_legajo=1, activo=True)
    chk1.items.append(ChecklistItem(
        nombre_plan="P1", nombre_tarea="T1", frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO, insumos_utilizados=json.dumps([{"id": q.id, "nombre": q.nombre, "cantidad": 2.0, "unidad": "L"}])
    ))

    chk2 = Checklist(fecha=f2, responsable_legajo=1, activo=True)
    chk2.items.append(ChecklistItem(
        nombre_plan="P2", nombre_tarea="T2", frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO, insumos_utilizados=json.dumps([{"id": q.id, "nombre": q.nombre, "cantidad": 3.0, "unidad": "L"}])
    ))

    chk3 = Checklist(fecha=f3, responsable_legajo=1, activo=True)
    chk3.items.append(ChecklistItem(
        nombre_plan="P3", nombre_tarea="T3", frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO, insumos_utilizados=json.dumps([{"id": q.id, "nombre": q.nombre, "cantidad": 4.0, "unidad": "L"}])
    ))

    session.add_all([chk1, chk2, chk3])
    session.commit()

    res_sem = obtener_historico_consumo(session, desde=date(2026, 9, 1), hasta=date(2026, 9, 30), agrupacion_tiempo="semana")
    assert len(res_sem.evolucion) == 2
    assert res_sem.evolucion[0].total_consumido == 5.0  # 2 + 3
    assert res_sem.evolucion[1].total_consumido == 4.0  # 4

    res_mes = obtener_historico_consumo(session, desde=date(2026, 9, 1), hasta=date(2026, 9, 30), agrupacion_tiempo="mes")
    assert len(res_mes.evolucion) == 1
    assert res_mes.evolucion[0].total_consumido == 9.0  # 2 + 3 + 4

