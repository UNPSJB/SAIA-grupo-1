from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.checklist.models import Checklist, ChecklistItem, EstadoTareaItem, ReasignacionPendiente
from src.config import settings
from src.incidentes.models import Incidente
from src.informes import constants, exceptions, schemas
from src.logger import get_logger
from src.personal.models import Personal
from src.vencimientos.services import listar_vencimientos_consolidados

logger = get_logger(__name__)


def _porcentaje(cumplidas: int, incumplidas: int) -> Optional[float]:
    evaluadas = cumplidas + incumplidas
    if evaluadas == 0:
        return None
    return round(cumplidas / evaluadas * 100.0, 1)


def _formatear_motivo(motivo: Optional[str]) -> Optional[str]:
    if not motivo:
        return None
    return constants.ETIQUETAS_MOTIVO.get(motivo, motivo)


def _responsable(item: ChecklistItem) -> Optional[str]:
    return item.nombre_responsable or item.checklist.nombre_responsable


def _items_del_periodo(db: Session, desde: date, hasta: date) -> List[ChecklistItem]:
    consulta = (
        select(ChecklistItem)
        .join(Checklist, ChecklistItem.checklist_id == Checklist.id)
        .where(
            Checklist.activo == True,  # noqa: E712
            Checklist.fecha >= desde,
            Checklist.fecha <= hasta,
        )
        .order_by(Checklist.fecha, ChecklistItem.id)
    )
    return list(db.scalars(consulta).all())


def _resumir_cumplimiento(items: List[ChecklistItem]) -> schemas.ResumenCumplimiento:
    conteo = defaultdict(int)
    por_plan: Dict[str, Dict[str, int]] = defaultdict(lambda: {"cumplidas": 0, "incumplidas": 0})

    for item in items:
        estado = item.estado  # la propiedad ya resuelve si un PENDIENTE pasó a VENCIDO
        conteo[estado] += 1
        if estado in constants.ESTADOS_CUMPLIDOS:
            por_plan[item.nombre_plan]["cumplidas"] += 1
        elif estado in constants.ESTADOS_INCUMPLIDOS:
            por_plan[item.nombre_plan]["incumplidas"] += 1

    cumplidas = sum(conteo[e] for e in constants.ESTADOS_CUMPLIDOS)
    incumplidas = sum(conteo[e] for e in constants.ESTADOS_INCUMPLIDOS)

    return schemas.ResumenCumplimiento(
        cumplidas=cumplidas,
        no_realizadas=conteo[EstadoTareaItem.NO_REALIZADO],
        vencidas=conteo[EstadoTareaItem.VENCIDO],
        reasignadas=conteo[EstadoTareaItem.REASIGNADO],
        en_curso=conteo[EstadoTareaItem.PENDIENTE],
        porcentaje=_porcentaje(cumplidas, incumplidas),
        por_plan=[
            schemas.CumplimientoPlan(
                nombre_plan=nombre,
                cumplidas=valores["cumplidas"],
                incumplidas=valores["incumplidas"],
                porcentaje=_porcentaje(valores["cumplidas"], valores["incumplidas"]),
            )
            for nombre, valores in sorted(por_plan.items())
        ],
    )


def _tareas_incumplidas(items: List[ChecklistItem]) -> List[schemas.TareaIncumplida]:
    return [
        schemas.TareaIncumplida(
            fecha=item.checklist.fecha,
            tarea=item.nombre_tarea,
            plan=item.nombre_plan,
            ubicacion=item.nombre_equipo,
            responsable=_responsable(item),
            estado=constants.ETIQUETAS_ESTADO_TAREA[item.estado],
            motivo=_formatear_motivo(item.motivo_no_realizado),
            observacion=item.observacion_no_realizado,
            marcada_el=item.fecha_hora_no_realizado,
        )
        for item in items
        if item.estado in constants.ESTADOS_INCUMPLIDOS
    ]


def _tareas_reasignadas(db: Session, items: List[ChecklistItem]) -> List[schemas.TareaReasignada]:
    reasignadas = []
    for item in items:
        if item.estado != EstadoTareaItem.REASIGNADO:
            continue

        reemplazo = db.get(ChecklistItem, item.tarea_reemplazo_id) if item.tarea_reemplazo_id else None
        if reemplazo:
            reasignada_a = _responsable(reemplazo)
            resultado = constants.ETIQUETAS_ESTADO_TAREA[reemplazo.estado]
        else:
            # el operador destino todavía no generó el checklist donde se le agrega la tarea
            pendiente = db.scalar(
                select(ReasignacionPendiente).where(ReasignacionPendiente.item_origen_id == item.id)
            )
            reasignada_a = None
            if pendiente:
                destino = db.get(Personal, pendiente.nuevo_responsable_legajo)
                reasignada_a = f"{destino.nombre} {destino.apellido}" if destino else None
            resultado = "Sin asignar todavía"

        reasignadas.append(
            schemas.TareaReasignada(
                fecha=item.checklist.fecha,
                tarea=item.nombre_tarea,
                plan=item.nombre_plan,
                responsable_original=_responsable(item),
                reasignada_a=reasignada_a,
                resultado=resultado,
            )
        )
    return reasignadas


def _vencimientos_del_periodo(db: Session, desde: date, hasta: date):
    vencimientos = [v for v in listar_vencimientos_consolidados(db) if desde <= v.fecha <= hasta]
    return sorted(vencimientos, key=lambda v: (v.fecha, v.concepto))


def _incidentes_cerrados(db: Session, desde: date, hasta: date) -> List[schemas.IncidenteCerrado]:
    consulta = (
        select(Incidente)
        .where(
            Incidente.estado.in_(constants.ESTADOS_INCIDENTE_CERRADO),
            Incidente.cerrado_el >= datetime.combine(desde, time.min),
            # "hasta" es inclusivo: llega hasta el final de ese día
            Incidente.cerrado_el < datetime.combine(hasta + timedelta(days=1), time.min),
        )
        .order_by(Incidente.cerrado_el)
    )
    return [
        schemas.IncidenteCerrado(
            id=inc.id,
            descripcion=inc.descripcion,
            reportado_el=inc.creado_el,
            reportado_por=inc.nombre_reportante,
            accion_correctiva=inc.accion_correctiva,
            cerrado_el=inc.cerrado_el or inc.creado_el,
            resuelto_por=inc.nombre_resolutor,
        )
        for inc in db.scalars(consulta).all()
    ]


def obtener_datos_informe(
    db: Session, desde: date, hasta: date, emitido_por: Optional[str] = None
) -> schemas.DatosInforme:
    if desde > hasta:
        logger.warning("Informe de inspección: rango inválido %s > %s", desde, hasta)
        raise exceptions.RangoFechasInvalido()

    items = _items_del_periodo(db, desde, hasta)

    return schemas.DatosInforme(
        desde=desde,
        hasta=hasta,
        emitido_el=datetime.now(),
        emitido_por=emitido_por,
        establecimiento=schemas.Establecimiento(
            nombre=settings.ESTABLECIMIENTO_NOMBRE,
            direccion=settings.ESTABLECIMIENTO_DIRECCION,
            cuit=settings.ESTABLECIMIENTO_CUIT,
        ),
        cumplimiento=_resumir_cumplimiento(items),
        tareas_incumplidas=_tareas_incumplidas(items),
        tareas_reasignadas=_tareas_reasignadas(db, items),
        vencimientos=_vencimientos_del_periodo(db, desde, hasta),
        incidentes_cerrados=_incidentes_cerrados(db, desde, hasta),
    )
