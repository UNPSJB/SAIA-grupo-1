from datetime import date, datetime, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.dashboard import services
from src.sectores.models import Sector
from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem
from src.tareas.models import Frecuencia
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.incidentes.models import Incidente, EstadoIncidente, TipoIncidente
from src.equipos.models import Equipo, Categoria, Estado
from src.plan_de_calibracion.models import Plan_de_Calibracion
from src.certificado.models import Certificado
from src.tipoCertificado.models import TipoCertificado
from src.personal.models import Personal
from src.controlesAmbientales.models import ControlAmbiental, TipoControlAmbiental
from tests.database import app, session

client = TestClient(app)

def test_matriz_calidad_radar_vacio(session: Session) -> None:
    res = services.obtener_matriz_calidad_radar(session, fecha_referencia=date(2026, 11, 10))
    assert res.indice_global_actual == 100.0
    assert len(res.dimensiones) == 6
    assert res.tiene_datos is False
    for dim in res.dimensiones:
        assert dim.actual == 100.0
        assert dim.anterior == 100.0
        assert dim.evaluados_actual == 0

def test_matriz_calidad_radar_con_datos_completos(session: Session) -> None:
    sector = Sector(nombre="Sector Amasado Radar")
    session.add(sector)
    session.commit()
    session.refresh(sector)

    plan = Plan_de_Limpieza(nombre="Plan Limpieza Amasado", sector_id=sector.id, fecha_inicio=date(2026, 1, 1))
    session.add(plan)
    session.commit()
    session.refresh(plan)

    hoy = date(2026, 11, 10)

    cl_act = Checklist(fecha=hoy - timedelta(days=5), responsable_legajo=1)
    session.add(cl_act)
    session.commit()
    session.refresh(cl_act)

    item1 = ChecklistItem(
        checklist_id=cl_act.id,
        plan_id=plan.id,
        nombre_plan=plan.nombre,
        nombre_tarea="Sanitizar amasadora",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO,
    )
    item2 = ChecklistItem(
        checklist_id=cl_act.id,
        plan_id=plan.id,
        nombre_plan=plan.nombre,
        nombre_tarea="Limpieza de tolva",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.NO_REALIZADO,
    )
    session.add_all([item1, item2])

    cl_ant = Checklist(fecha=hoy - timedelta(days=40), responsable_legajo=1)
    session.add(cl_ant)
    session.commit()
    session.refresh(cl_ant)

    item3 = ChecklistItem(
        checklist_id=cl_ant.id,
        plan_id=plan.id,
        nombre_plan=plan.nombre,
        nombre_tarea="Sanitizar amasadora pasada",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO,
    )
    session.add(item3)

    inc1 = Incidente(
        descripcion="Desvío de manguera",
        tipo=TipoIncidente.OTRO,
        estado=EstadoIncidente.RESUELTO,
        creado_el=datetime(2026, 11, 2, 10, 0),
        reportado_por_id=1,
    )
    inc_crit = Incidente(
        descripcion="Falla crítica en motor",
        tipo=TipoIncidente.OTRO,
        estado=EstadoIncidente.PENDIENTE,
        creado_el=datetime(2026, 11, 1, 10, 0),
        reportado_por_id=1,
    )
    session.add_all([inc1, inc_crit])

    eq = Equipo(
        nombre="Amasadora Industrial",
        categoria=Categoria.MANTENIMIENTO,
        sector_id=sector.id,
        estado=Estado.ACTIVO,
    )
    session.add(eq)
    session.commit()
    session.refresh(eq)

    cal = Plan_de_Calibracion(
        nombre="Calibración Balanza Amasado",
        fecha_mantenimiento=datetime(2026, 10, 1),
        fecha_vencimiento=datetime(2026, 12, 1),
        periodicidad_De_cambio=90,
        descripcion="Calibración rutinaria",
        equipo_id=eq.id,
    )
    session.add(cal)

    amb = ControlAmbiental(
        tipo=TipoControlAmbiental.PLAGAS.value,
        periodicidad_dias=30,
        activo=True,
        fecha_vencimiento=date(2026, 11, 25),
    )
    session.add(amb)

    persona = session.query(Personal).filter(Personal.legajo == 1).first()
    if not persona:
        persona = Personal(
            legajo=1,
            documento=12345678,
            nombre="Juan",
            apellido="Perez",
            email="juan.radar@test.com",
            usuario="juan_radar",
        )
        session.add(persona)
        session.flush()

    tipo_c = session.query(TipoCertificado).filter(TipoCertificado.nombre == "Carnet Manipulador Radar").first()
    if not tipo_c:
        tipo_c = TipoCertificado(nombre="Carnet Manipulador Radar")
        session.add(tipo_c)
        session.flush()

    cert = Certificado(
        id_tipo=tipo_c.id,
        fechaVencimiento=datetime(2026, 12, 1),
        legajo_persona=persona.legajo,
    )
    session.add(cert)
    session.commit()

    res = services.obtener_matriz_calidad_radar(session, sector_id=sector.id, fecha_referencia=hoy)
    assert res.sector_id == sector.id
    assert res.sector_nombre == "Sector Amasado Radar"
    assert res.tiene_datos is True

    dim_map = {d.clave: d for d in res.dimensiones}
    assert dim_map["higiene"].actual == 50.0
    assert dim_map["higiene"].anterior == 100.0
    assert dim_map["calibracion"].actual == 100.0
    assert dim_map["desvios"].actual == 50.0
    assert dim_map["ambiental"].actual == 100.0
    assert dim_map["capacitacion"].actual == 100.0
    assert dim_map["continuidad"].actual == 50.0

def test_evolucion_mensual_desvios_vacio(session: Session) -> None:
    res = services.obtener_evolucion_mensual_desvios(session, meses=4, fecha_referencia=date(2026, 11, 10))
    assert res.meses_evaluados == 4
    assert len(res.items) == 4
    assert res.tiene_datos is False
    assert res.resumen.total_eventos == 0
    assert res.resumen.tasa_conformidad_promedio == 0.0
    assert res.resumen.mes_mayor_desvio is None

def test_evolucion_mensual_desvios_con_datos(session: Session) -> None:
    sector = Sector(nombre="Sector Horneado Desvios")
    session.add(sector)
    session.commit()
    session.refresh(sector)

    plan = Plan_de_Limpieza(nombre="Plan Horneado", sector_id=sector.id, fecha_inicio=date(2026, 1, 1))
    session.add(plan)
    session.commit()
    session.refresh(plan)

    hoy = date(2026, 11, 10)

    cl = Checklist(fecha=date(2026, 10, 15), responsable_legajo=1)
    session.add(cl)
    session.commit()
    session.refresh(cl)

    it_conf = ChecklistItem(
        checklist_id=cl.id,
        plan_id=plan.id,
        nombre_plan="Plan Limpieza",
        nombre_tarea="Sanitizado",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.REALIZADO,
    )
    it_venc = ChecklistItem(
        checklist_id=cl.id,
        plan_id=plan.id,
        nombre_plan="Plan Limpieza",
        nombre_tarea="Limpieza Piso",
        frecuencia=Frecuencia.DIARIA,
        estado=EstadoTareaItem.VENCIDO,
    )
    session.add_all([it_conf, it_venc])

    inc_reciente = Incidente(
        descripcion="Olor a quemado leve",
        tipo=TipoIncidente.OTRO,
        estado=EstadoIncidente.PENDIENTE,
        creado_el=datetime(2026, 11, 9, 12, 0),
        reportado_por_id=1,
    )
    inc_reabierto = Incidente(
        descripcion="Falla recurrente en cinta",
        tipo=TipoIncidente.OTRO,
        estado=EstadoIncidente.PENDIENTE,
        creado_el=datetime(2026, 10, 5, 10, 0),
        reportado_por_id=1,
        motivo_reapertura="Falla recurrente",
    )
    session.add_all([inc_reciente, inc_reabierto])
    session.commit()

    res = services.obtener_evolucion_mensual_desvios(session, meses=14, sector_id=sector.id, fecha_referencia=hoy)
    assert res.tiene_datos is True
    assert res.sector_id == sector.id
    assert res.sector_nombre == "Sector Horneado Desvios"
    assert res.resumen.total_eventos >= 2
    assert res.resumen.total_desvios >= 1

def test_router_endpoints_graficos_nuevos(session: Session) -> None:
    res_radar = client.get("/dashboard/matriz-calidad-radar")
    assert res_radar.status_code == status.HTTP_200_OK
    data_radar = res_radar.json()
    assert "dimensiones" in data_radar
    assert "indice_global_actual" in data_radar
    assert len(data_radar["dimensiones"]) == 6

    res_evol = client.get("/dashboard/evolucion-mensual-desvios?meses=6")
    assert res_evol.status_code == status.HTTP_200_OK
    data_evol = res_evol.json()
    assert "items" in data_evol
    assert "resumen" in data_evol
    assert len(data_evol["items"]) == 6
