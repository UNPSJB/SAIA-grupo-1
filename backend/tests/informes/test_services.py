from datetime import date, datetime, timedelta
import pytest
from sqlalchemy.orm import Session
from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem
from src.incidentes.constants import EstadoIncidente
from src.incidentes.models import Incidente
from src.informes import exceptions, pdf, services
from src.tareas.models import Frecuencia
from src.vencimientos.schemas import EstadoVencimiento, OrigenVencimiento, VencimientoConsolidadoItem
from tests.database import session  # noqa: F401

HOY = date.today()
DESDE = HOY - timedelta(days=10)


def _checklist(session: Session, fecha: date, legajo: int = 1, activo: bool = True) -> Checklist:
    checklist = Checklist(fecha=fecha, responsable_legajo=legajo, activo=activo)
    session.add(checklist)
    session.flush()
    return checklist


def _item(session: Session, checklist: Checklist, estado: EstadoTareaItem, plan="Plan Horno", **extra) -> ChecklistItem:
    item = ChecklistItem(
        checklist=checklist,
        nombre_plan=plan,
        nombre_tarea=f"Tarea {estado}",
        frecuencia=Frecuencia.DIARIA,
        estado=estado,
        responsable_legajo=checklist.responsable_legajo,
        **extra,
    )
    session.add(item)
    session.flush()
    return item


def _incidente(session: Session, estado: EstadoIncidente, cerrado_el: datetime | None) -> Incidente:
    incidente = Incidente(
        descripcion="Heladera con temperatura fuera de rango",
        estado=estado,
        creado_el=datetime.combine(DESDE, datetime.min.time()),
        reportado_por_id=1,
        accion_correctiva="Se recalibró el termostato" if cerrado_el else None,
        cerrado_el=cerrado_el,
        resuelto_por_id=2 if cerrado_el else None,
    )
    session.add(incidente)
    session.flush()
    return incidente


def test_porcentaje_solo_considera_realizadas_contra_incumplidas(session: Session):
    pasado = _checklist(session, HOY - timedelta(days=5))
    for _ in range(3):
        _item(session, pasado, EstadoTareaItem.REALIZADO)
    _item(session, pasado, EstadoTareaItem.NO_REALIZADO, motivo_no_realizado="falta_de_insumo")
    _item(session, pasado, EstadoTareaItem.VENCIDO)
    _item(session, pasado, EstadoTareaItem.REASIGNADO)
    # el checklist de hoy sigue en plazo: no cuenta ni a favor ni en contra
    _item(session, _checklist(session, HOY), EstadoTareaItem.PENDIENTE)

    resumen = services.obtener_datos_informe(session, DESDE, HOY).cumplimiento

    assert resumen.cumplidas == 3
    assert resumen.no_realizadas == 1
    assert resumen.vencidas == 1
    assert resumen.reasignadas == 1
    assert resumen.en_curso == 1
    assert resumen.evaluadas == 5
    assert resumen.porcentaje == 60.0


def test_pendiente_fuera_de_plazo_cuenta_como_vencida(session: Session):
    _item(session, _checklist(session, HOY - timedelta(days=3)), EstadoTareaItem.PENDIENTE)

    resumen = services.obtener_datos_informe(session, DESDE, HOY).cumplimiento

    assert resumen.vencidas == 1
    assert resumen.en_curso == 0
    assert resumen.porcentaje == 0.0


def test_cumplimiento_por_plan(session: Session):
    checklist = _checklist(session, HOY - timedelta(days=2))
    _item(session, checklist, EstadoTareaItem.REALIZADO, plan="Plan Horno")
    _item(session, checklist, EstadoTareaItem.VENCIDO, plan="Plan Horno")
    _item(session, checklist, EstadoTareaItem.REALIZADO, plan="Plan Freezer")

    por_plan = {p.nombre_plan: p for p in services.obtener_datos_informe(session, DESDE, HOY).cumplimiento.por_plan}

    assert por_plan["Plan Horno"].porcentaje == 50.0
    assert por_plan["Plan Freezer"].porcentaje == 100.0


def test_ignora_checklists_fuera_del_periodo_o_inactivos(session: Session):
    _item(session, _checklist(session, DESDE - timedelta(days=1)), EstadoTareaItem.VENCIDO)
    _item(session, _checklist(session, HOY - timedelta(days=4), activo=False), EstadoTareaItem.VENCIDO)
    _item(session, _checklist(session, HOY - timedelta(days=3)), EstadoTareaItem.REALIZADO)

    resumen = services.obtener_datos_informe(session, DESDE, HOY).cumplimiento

    assert resumen.evaluadas == 1
    assert resumen.porcentaje == 100.0


def test_tareas_incumplidas_incluyen_la_justificacion(session: Session):
    checklist = _checklist(session, HOY - timedelta(days=2))
    marcada_el = datetime.combine(HOY - timedelta(days=2), datetime.min.time())
    _item(
        session, checklist, EstadoTareaItem.NO_REALIZADO,
        motivo_no_realizado="equipo_fuera_de_uso",
        observacion_no_realizado="El horno está en reparación",
        fecha_hora_no_realizado=marcada_el,
    )
    _item(session, checklist, EstadoTareaItem.VENCIDO)
    _item(session, checklist, EstadoTareaItem.REALIZADO)

    incumplidas = services.obtener_datos_informe(session, DESDE, HOY).tareas_incumplidas

    assert len(incumplidas) == 2
    no_realizada = next(t for t in incumplidas if t.estado == "No realizada")
    assert no_realizada.motivo == "Equipo fuera de uso"
    assert no_realizada.observacion == "El horno está en reparación"
    assert no_realizada.marcada_el == marcada_el
    assert no_realizada.responsable == "Juan Perez"
    vencida = next(t for t in incumplidas if t.estado == "Vencida")
    assert vencida.motivo is None


def test_tarea_reasignada_se_evalua_en_su_reemplazo(session: Session):
    original = _item(session, _checklist(session, HOY - timedelta(days=3)), EstadoTareaItem.REASIGNADO)
    reemplazo = _item(
        session, _checklist(session, HOY - timedelta(days=2), legajo=2), EstadoTareaItem.REALIZADO,
        es_reasignada=True, tarea_origen_id=original.id,
    )
    original.tarea_reemplazo_id = reemplazo.id
    session.flush()

    datos = services.obtener_datos_informe(session, DESDE, HOY)

    assert datos.cumplimiento.evaluadas == 1
    assert datos.cumplimiento.porcentaje == 100.0
    assert len(datos.tareas_reasignadas) == 1
    reasignada = datos.tareas_reasignadas[0]
    assert reasignada.responsable_original == "Juan Perez"
    assert reasignada.reasignada_a == "Ana Dominguez"
    assert reasignada.resultado == "Realizada"


def test_solo_incidentes_cerrados_dentro_del_periodo(session: Session):
    dentro = datetime.combine(HOY - timedelta(days=1), datetime.min.time())
    cerrado = _incidente(session, EstadoIncidente.CERRADO, dentro)
    legado = _incidente(session, EstadoIncidente.RESUELTO, dentro)
    _incidente(session, EstadoIncidente.CERRADO, datetime.combine(DESDE - timedelta(days=1), datetime.min.time()))
    _incidente(session, EstadoIncidente.DESCARTADO, dentro)
    _incidente(session, EstadoIncidente.PENDIENTE, None)

    incidentes = services.obtener_datos_informe(session, DESDE, HOY).incidentes_cerrados

    assert {i.id for i in incidentes} == {cerrado.id, legado.id}
    assert incidentes[0].accion_correctiva == "Se recalibró el termostato"
    assert incidentes[0].resuelto_por == "Ana Dominguez"


def test_incidente_cerrado_el_ultimo_dia_del_periodo_se_incluye(session: Session):
    _incidente(session, EstadoIncidente.CERRADO, datetime.combine(HOY, datetime.max.time()))

    assert len(services.obtener_datos_informe(session, DESDE, HOY).incidentes_cerrados) == 1


def test_solo_vencimientos_dentro_del_periodo(session: Session, monkeypatch: pytest.MonkeyPatch):
    def vencimiento(id_: str, fecha: date) -> VencimientoConsolidadoItem:
        return VencimientoConsolidadoItem(
            id=id_, origen=OrigenVencimiento.PERSONAL, concepto="Libreta sanitaria", responsable="Juan Perez",
            referencia_id=1, fecha=fecha, dias_restantes=0, estado=EstadoVencimiento.VENCIDO,
        )

    monkeypatch.setattr(services, "listar_vencimientos_consolidados", lambda db: [
        vencimiento("antes", DESDE - timedelta(days=1)),
        vencimiento("hasta", HOY),
        vencimiento("desde", DESDE),
        vencimiento("despues", HOY + timedelta(days=1)),
    ])

    vencimientos = services.obtener_datos_informe(session, DESDE, HOY).vencimientos

    assert [v.id for v in vencimientos] == ["desde", "hasta"]


def test_periodo_sin_datos(session: Session):
    datos = services.obtener_datos_informe(session, DESDE, HOY)

    assert datos.cumplimiento.porcentaje is None
    assert datos.cumplimiento.por_plan == []
    assert datos.tareas_incumplidas == []
    assert datos.incidentes_cerrados == []


def test_rango_invertido_falla(session: Session):
    with pytest.raises(exceptions.RangoFechasInvalido):
        services.obtener_datos_informe(session, HOY, DESDE)


def test_pdf_tolera_caracteres_fuera_de_la_fuente(session: Session):
    incidente = _incidente(session, EstadoIncidente.CERRADO, datetime.combine(HOY, datetime.min.time()))
    incidente.accion_correctiva = "Se cambió el burlete ✅ – temperatura ≤ 4 °C “ok” 😀"
    session.flush()

    contenido = pdf.generar_pdf(services.obtener_datos_informe(session, DESDE, HOY))

    assert contenido.startswith(b"%PDF")
