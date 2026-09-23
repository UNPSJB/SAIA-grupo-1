import json
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.checklist import exceptions, models, schemas
from src.equipos.models import Equipo, Estado
from src.personal.models import Personal
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.tareas.models import Frecuencia


def tarea_corresponde_a_fecha(
    frecuencia: Frecuencia, fecha_inicio_plan: date, fecha_checklist: date
) -> bool:
    if fecha_checklist < fecha_inicio_plan:
        return False

    dias = (fecha_checklist - fecha_inicio_plan).days

    if frecuencia == Frecuencia.DIARIO:
        return True
    elif frecuencia == Frecuencia.SEMANAL:
        return dias % 7 == 0
    elif frecuencia == Frecuencia.MENSUAL:
        return (fecha_checklist.day == fecha_inicio_plan.day) or (
            dias > 0 and dias % 30 == 0
        )

    return False


def generar_checklist(
    db: Session, datos: schemas.ChecklistGenerar
) -> models.Checklist:
    fecha = datos.fecha or date.today()
    if fecha > date.today():
        raise exceptions.ChecklistFechaFutura()

    responsable = db.scalar(
        select(Personal).where(Personal.legajo == datos.responsable_legajo)
    )
    if not responsable:
        raise exceptions.ResponsableNoEncontrado()
    if not responsable.activo:
        raise exceptions.ResponsableInactivo()

    planes = (
        db.scalars(
            select(Plan_de_Limpieza)
            .join(Equipo)
            .where(
                Equipo.estado == Estado.ACTIVO,
                Plan_de_Limpieza.fecha_inicio <= fecha,
            )
        )
        .all()
    )

    items_a_crear: List[models.ChecklistItem] = []

    for plan in planes:
        for tarea in plan.tareas:
            if tarea_corresponde_a_fecha(
                tarea.frecuencia, plan.fecha_inicio, fecha
            ):
                item = models.ChecklistItem(
                    plan_id=plan.id,
                    nombre_plan=plan.nombre,
                    tarea_id=tarea.id,
                    nombre_tarea=tarea.nombre,
                    descripcion_tarea=tarea.descripcion,
                    frecuencia=tarea.frecuencia,
                    estado=models.EstadoTareaItem.PENDIENTE,
                )
                items_a_crear.append(item)

    if not items_a_crear:
        raise exceptions.NoHayTareasCorrespondientes()

    checklist = models.Checklist(
        fecha=fecha,
        responsable_legajo=datos.responsable_legajo,
        activo=True,
        items=items_a_crear,
    )
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist


def completar_tarea(
    db: Session,
    checklist_id: int,
    item_id: int,
    datos: schemas.CompletarTareaSchema,
) -> models.ChecklistItem:
    obtener_checklist(db, checklist_id)

    item = db.scalar(
        select(models.ChecklistItem).where(
            models.ChecklistItem.id == item_id,
            models.ChecklistItem.checklist_id == checklist_id,
        )
    )
    if not item:
        raise exceptions.TareaChecklistNoEncontrada()

    if item.estado == models.EstadoTareaItem.REALIZADO:
        raise exceptions.TareaYaCompletada()

    responsable = db.scalar(
        select(Personal).where(Personal.legajo == datos.responsable_legajo)
    )
    if not responsable:
        raise exceptions.ResponsableNoEncontrado()

    if not responsable.activo:
        raise exceptions.ResponsableInactivo()

    item.responsable_legajo = datos.responsable_legajo
    item.imagen = datos.imagen
    if datos.insumos_utilizados:
        item.insumos_utilizados = json.dumps(
            [insumo.model_dump() for insumo in datos.insumos_utilizados],
            ensure_ascii=False,
        )
    else:
        item.insumos_utilizados = "[]"

    item.estado = models.EstadoTareaItem.REALIZADO
    item.fecha_hora_fin = datetime.now()

    db.commit()
    db.refresh(item)
    return item


def actualizar_tarea(
    db: Session,
    checklist_id: int,
    item_id: int,
    datos: schemas.ChecklistItemUpdate,
) -> models.ChecklistItem:
    obtener_checklist(db, checklist_id)

    item = db.scalar(
        select(models.ChecklistItem).where(
            models.ChecklistItem.id == item_id,
            models.ChecklistItem.checklist_id == checklist_id,
        )
    )
    if not item:
        raise exceptions.TareaChecklistNoEncontrada()

    campos_modificados = datos.model_dump(exclude_unset=True)

    if "responsable_legajo" in campos_modificados:
        legajo = campos_modificados["responsable_legajo"]
        if legajo is not None:
            responsable = db.scalar(
                select(Personal).where(Personal.legajo == legajo)
            )
            if not responsable:
                raise exceptions.ResponsableNoEncontrado()
            if not responsable.activo:
                raise exceptions.ResponsableInactivo()
        item.responsable_legajo = legajo

    if "imagen" in campos_modificados:
        item.imagen = campos_modificados["imagen"]

    if "insumos_utilizados" in campos_modificados:
        insumos = campos_modificados["insumos_utilizados"]
        if insumos:
            item.insumos_utilizados = json.dumps(
                [insumo.model_dump() if hasattr(insumo, "model_dump") else insumo for insumo in insumos],
                ensure_ascii=False,
            )
        else:
            item.insumos_utilizados = "[]"

    if "estado" in campos_modificados:
        nuevo_estado = campos_modificados["estado"]
        item.estado = nuevo_estado
        if nuevo_estado == models.EstadoTareaItem.REALIZADO:
            if not item.fecha_hora_fin:
                item.fecha_hora_fin = datetime.now()
        else:
            item.fecha_hora_fin = None

    db.commit()
    db.refresh(item)
    return item


def listar_checklists(
    db: Session,
    fecha: Optional[date] = None,
    estado: Optional[str] = None,
    incluir_inactivos: bool = False,
) -> List[models.Checklist]:
    query = select(models.Checklist).order_by(models.Checklist.fecha.desc())
    if not incluir_inactivos:
        query = query.where(models.Checklist.activo.is_(True))
    if fecha:
        query = query.where(models.Checklist.fecha == fecha)

    checklists = db.scalars(query).all()

    if estado:
        estado_lower = estado.lower()
        checklists = [c for c in checklists if c.estado.value == estado_lower]

    return checklists


def obtener_checklist(
    db: Session,
    checklist_id: int,
    incluir_inactivos: bool = False,
) -> models.Checklist:
    query = select(models.Checklist).where(models.Checklist.id == checklist_id)
    if not incluir_inactivos:
        query = query.where(models.Checklist.activo.is_(True))

    checklist = db.scalar(query)
    if not checklist:
        raise exceptions.ChecklistNoEncontrado()
    return checklist


def eliminar_checklist(db: Session, checklist_id: int) -> models.Checklist:
    checklist = obtener_checklist(db, checklist_id)
    checklist.activo = False
    db.commit()
    db.refresh(checklist)
    return checklist


def restaurar_checklist(db: Session, checklist_id: int) -> models.Checklist:
    checklist = obtener_checklist(db, checklist_id, incluir_inactivos=True)
    if checklist.activo:
        raise exceptions.ChecklistYaActivo()
    checklist.activo = True
    db.commit()
    db.refresh(checklist)
    return checklist


undelete_checklist = restaurar_checklist
