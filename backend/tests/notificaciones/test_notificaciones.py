from tests.database import session
from datetime import date, datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.main import app
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.certificado.models import Certificado
from src.tipoCertificado.models import TipoCertificado
from src.equipos.models import Equipo, Categoria, Estado
from src.sectores.models import Sector
from src.plan_de_calibracion.models import Plan_de_Calibracion
from src.documentos.models import Documento, VersionDocumento
from src.documentos.constants import TipoDocumento
from src.elementosDeLimpieza.models import ElementoDeLimpieza
from src.insumos_quimicos.models import InsumoQuimico
from src.insumos_quimicos.constants import TipoQuimicoEnum, UnidadMedidaEnum
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.tareas.models import Tarea, Frecuencia
from src.tareas.services import editar_tarea
from src.tareas.schemas import TareaUpdate
from src.notificaciones.models import Notificacion
from src.notificaciones.constants import TipoNotificacion
from src.notificaciones import services, schemas


def test_crear_notificacion_y_no_duplicar(session: Session):
    operador = session.query(Personal).filter(Personal.legajo == 1).first()
    assert operador is not None

    clave = f"test_duplicado_{operador.legajo}_2026-10-22"
    data = schemas.NotificacionCreate(
        usuario_id=operador.legajo,
        titulo="Alerta de Prueba",
        mensaje="Este es un mensaje de prueba",
        tipo=TipoNotificacion.GENERAL,
        clave_duplicado=clave,
    )

    notif1, creada1 = services.crear_notificacion(session, data)
    assert notif1 is not None
    assert notif1.id is not None
    assert notif1.leida is False
    assert creada1 is True

    notif2, creada2 = services.crear_notificacion(session, data)
    assert notif2.id == notif1.id
    assert creada2 is False

    total = session.query(Notificacion).filter(Notificacion.clave_duplicado == clave).count()
    assert total == 1


def test_aislamiento_notificaciones_por_usuario(session: Session):
    juan = session.query(Personal).filter(Personal.legajo == 1).first()
    ana = session.query(Personal).filter(Personal.legajo == 2).first()
    assert juan is not None and ana is not None

    services.crear_notificacion(
        session,
        schemas.NotificacionCreate(
            usuario_id=juan.legajo,
            titulo="Para Juan",
            mensaje="Mensaje exclusivo de Juan",
            tipo=TipoNotificacion.GENERAL,
        ),
    )
    services.crear_notificacion(
        session,
        schemas.NotificacionCreate(
            usuario_id=ana.legajo,
            titulo="Para Ana",
            mensaje="Mensaje exclusivo de Ana",
            tipo=TipoNotificacion.GENERAL,
        ),
    )

    items_juan, _, _ = services.listar_notificaciones(session, juan.legajo)
    items_ana, _, _ = services.listar_notificaciones(session, ana.legajo)

    titulos_juan = [n.titulo for n in items_juan]
    titulos_ana = [n.titulo for n in items_ana]

    assert "Para Juan" in titulos_juan
    assert "Para Ana" not in titulos_juan

    assert "Para Ana" in titulos_ana
    assert "Para Juan" not in titulos_ana


def test_marcar_leida_y_marcar_todas(session: Session):
    juan = session.query(Personal).filter(Personal.legajo == 1).first()
    ana = session.query(Personal).filter(Personal.legajo == 2).first()

    n1, _ = services.crear_notificacion(
        session,
        schemas.NotificacionCreate(
            usuario_id=juan.legajo,
            titulo="Notif 1",
            mensaje="Msg 1",
            tipo=TipoNotificacion.GENERAL,
        ),
    )
    n2, _ = services.crear_notificacion(
        session,
        schemas.NotificacionCreate(
            usuario_id=juan.legajo,
            titulo="Notif 2",
            mensaje="Msg 2",
            tipo=TipoNotificacion.GENERAL,
        ),
    )

    actualizada = services.marcar_leida(session, n1.id, juan.legajo)
    assert actualizada.leida is True
    assert actualizada.leida_el is not None

    with pytest.raises(Exception):
        services.marcar_leida(session, n2.id, ana.legajo)

    afectadas = services.marcar_todas_leidas(session, juan.legajo)
    assert afectadas >= 1

    _, total_no_leidas, _ = services.listar_notificaciones(session, juan.legajo)
    assert total_no_leidas == 0


def test_generacion_automatica_vencimientos(session: Session):
    hoy = date(2026, 10, 22)

    ana = session.query(Personal).filter(Personal.legajo == 2).first()
    assert ana is not None
    ana.capacidad = Capacidades.ADMINISTRAR
    session.commit()

    sector = session.query(Sector).first()
    sector_id = sector.id if sector else 1

    tipo_c = TipoCertificado(nombre="Carnet Manipulador")
    session.add(tipo_c)
    session.flush()

    juan = session.query(Personal).filter(Personal.legajo == 1).first()
    cert = Certificado(
        id_tipo=tipo_c.id,
        fechaVencimiento=datetime.combine(hoy + timedelta(days=10), datetime.min.time()),
        legajo_persona=juan.legajo,
    )
    session.add(cert)

    eq = Equipo(
        nombre="Balanza de Precision",
        categoria=Categoria.MANTENIMIENTO,
        estado=Estado.ACTIVO,
        sector_id=sector_id,
    )
    session.add(eq)
    session.flush()

    plan_cal = Plan_de_Calibracion(
        nombre="Calibracion Balanza",
        fecha_mantenimiento=datetime.combine(hoy - timedelta(days=32), datetime.min.time()),
        fecha_vencimiento=datetime.combine(hoy - timedelta(days=2), datetime.min.time()),
        descripcion="Calibracion periodica de balanza de precision",
        equipo_id=eq.id,
        periodicidad_De_cambio=30,
    )
    session.add(plan_cal)

    elem = ElementoDeLimpieza(
        nombre="Mopa Microfibra",
        frecuenciaDeCambio=7,
        fechaCambio=datetime.combine(hoy + timedelta(days=2), datetime.min.time()),
        activo=True,
    )
    session.add(elem)

    doc = Documento(
        titulo="Procedimiento de Control de Plagas y Roedores",
        tipo=TipoDocumento.PROCEDIMIENTO,
        activo=True,
    )
    session.add(doc)
    session.flush()

    ver = VersionDocumento(
        documento_id=doc.id,
        version=1,
        archivo_nombre="test.pdf",
        archivo_nombre_original="test.pdf",
        tamanio_bytes=1024,
        es_vigente=True,
        fecha_vigencia=hoy - timedelta(days=360),
        creado_por_legajo=juan.legajo,
    )
    session.add(ver)
    session.commit()

    generadas = services.revisar_y_generar_vencimientos(session, hoy=hoy)
    assert generadas > 0

    generadas_segunda = services.revisar_y_generar_vencimientos(session, hoy=hoy)
    assert generadas_segunda == 0


def test_evento_tarea_reasignada(session: Session):
    juan = session.query(Personal).filter(Personal.legajo == 1).first()
    ana = session.query(Personal).filter(Personal.legajo == 2).first()

    plan_l = Plan_de_Limpieza(nombre="Plan Limpieza Cuadra", fecha_inicio=date.today())
    session.add(plan_l)
    session.flush()

    tarea = Tarea(
        nombre="Barrer Harina",
        descripcion="Barrer restos",
        frecuencia=Frecuencia.DIARIA,
        plan_id=plan_l.id,
        personal_id=juan.legajo,
    )
    session.add(tarea)
    session.commit()

    editar_tarea(
        session,
        tarea.id,
        TareaUpdate(
            nombre="Barrer Harina",
            descripcion="Barrer restos",
            frecuencia=Frecuencia.DIARIA,
            plan_id=plan_l.id,
            personal_id=ana.legajo,
        ),
    )

    items_ana, _, _ = services.listar_notificaciones(session, ana.legajo)
    notifs_tarea = [n for n in items_ana if n.tipo == TipoNotificacion.EVENTO_TAREA_REASIGNADA]
    assert len(notifs_tarea) >= 1
    assert "Barrer Harina" in notifs_tarea[0].mensaje


def test_evento_stock_bajo_quimico(session: Session):
    ana = session.query(Personal).filter(Personal.legajo == 2).first()
    assert ana is not None
    ana.capacidad = Capacidades.ADMINISTRAR
    session.commit()

    quimico = InsumoQuimico(
        nombre="Detergente Industrial Super Concentrado",
        tipo=TipoQuimicoEnum.DETERGENTE,
        unidad_medida=UnidadMedidaEnum.LITROS,
        stock_actual=3.0,
        activo=True,
    )
    session.add(quimico)
    session.commit()

    notifs = services.notificar_stock_bajo_quimico_si_corresponde(session, quimico)
    assert len(notifs) >= 1
    assert any("stock bajo" in n.mensaje.lower() for n in notifs)


def test_endpoints_api_notificaciones(session: Session):
    client = TestClient(app)

    res = client.get("/notificaciones/")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total_no_leidas" in data

    if data["items"]:
        primera_id = data["items"][0]["id"]

        res_leer = client.put(f"/notificaciones/{primera_id}/leer")
        assert res_leer.status_code == 200
        assert res_leer.json()["leida"] is True

    res_todas = client.put("/notificaciones/leer-todas")
    assert res_todas.status_code == 200
    assert "marcadas" in res_todas.json()

def test_notificacion_incidente_critico_sin_resolver(session: Session):
    admin = session.query(Personal).filter(Personal.legajo == 2).first()
    assert admin is not None
    admin.capacidad = Capacidades.ADMINISTRAR
    session.commit()

    operador = session.query(Personal).filter(Personal.legajo == 1).first()

    from src.incidentes.models import Incidente
    from src.incidentes.constants import EstadoIncidente, TipoIncidente

    inc_critico = Incidente(
        descripcion="Falla crítica en cinta transportadora principal",
        tipo=TipoIncidente.EQUIPAMIENTO,
        estado=EstadoIncidente.PENDIENTE,
        creado_el=datetime.now() - timedelta(hours=80),
        reportado_por_id=operador.legajo,
    )
    session.add(inc_critico)
    session.commit()

    generadas = services.revisar_y_generar_vencimientos(session)
    assert generadas > 0

    items_admin, _, _ = services.listar_notificaciones(session, admin.legajo)
    notifs_criticas = [n for n in items_admin if n.tipo == TipoNotificacion.INCIDENTE_CRITICO and n.entidad_id == inc_critico.id]
    assert len(notifs_criticas) >= 1
    assert "sin resolución" in notifs_criticas[0].mensaje.lower() or "sin resolver" in notifs_criticas[0].mensaje.lower()


def test_notificacion_creacion_incidente(session: Session):
    admin = session.query(Personal).filter(Personal.legajo == 2).first()
    assert admin is not None
    admin.capacidad = Capacidades.ADMINISTRAR
    session.commit()

    operador = session.query(Personal).filter(Personal.legajo == 1).first()

    from src.incidentes.services import crear_incidente
    from src.incidentes.constants import TipoIncidente

    inc = crear_incidente(
        session,
        usuario=operador,
        descripcion="Derrame de líquido en sector de empaque",
        tipo=TipoIncidente.LIMPIEZA,
    )
    assert inc.id is not None

    items_admin, _, _ = services.listar_notificaciones(session, admin.legajo)
    notifs_inc = [n for n in items_admin if n.entidad_tipo == "incidente" and n.entidad_id == inc.id]
    assert len(notifs_inc) >= 1
    assert "Derrame de líquido" in notifs_inc[0].mensaje
