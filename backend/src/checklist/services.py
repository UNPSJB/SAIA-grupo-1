import json
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.checklist import exceptions, models, schemas
from src.equipos.models import Equipo, Estado
from src.personal.models import Personal
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.tareas.models import Frecuencia

IMAGENES_DIR = Path(__file__).resolve().parent / "imagenes"
IMAGENES_DIR.mkdir(parents=True, exist_ok=True)


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


def guardar_archivo_imagen_tarea(
    db: Session, checklist_id: int, item_id: int, file: UploadFile
) -> models.ChecklistItem:
    checklist = obtener_checklist(db, checklist_id)
    if checklist.estado in (
        models.EstadoGeneralChecklist.COMPLETADO,
        models.EstadoGeneralChecklist.VENCIDO,
    ):
        raise exceptions.ChecklistNoModificable()

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

    extension = Path(file.filename or "").suffix.lower()
    tipos_validos = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    if extension not in tipos_validos:
        if file.content_type == "image/jpeg":
            extension = ".jpg"
        elif file.content_type == "image/png":
            extension = ".png"
        elif file.content_type == "image/webp":
            extension = ".webp"
        elif file.content_type == "image/gif":
            extension = ".gif"
        else:
            raise exceptions.FormatoImagenInvalido()

    contenido = file.file.read()
    if not contenido:
        raise exceptions.FormatoImagenInvalido()

    if item.imagen and item.imagen.startswith("/checklist/imagenes/"):
        nombre_previo = Path(item.imagen).name
        ruta_previa = IMAGENES_DIR / nombre_previo
        if ruta_previa.is_file():
            try:
                ruta_previa.unlink()
            except OSError:
                pass

    nombre_nuevo = f"chk_{checklist_id}_item_{item_id}_{uuid.uuid4().hex[:8]}{extension}"
    ruta_destino = IMAGENES_DIR / nombre_nuevo
    with open(ruta_destino, "wb") as f:
        f.write(contenido)

    item.imagen = f"/checklist/imagenes/{nombre_nuevo}"
    db.commit()
    db.refresh(item)
    return item


def eliminar_imagen_tarea(
    db: Session, checklist_id: int, item_id: int
) -> models.ChecklistItem:
    checklist = obtener_checklist(db, checklist_id)
    if checklist.estado in (
        models.EstadoGeneralChecklist.COMPLETADO,
        models.EstadoGeneralChecklist.VENCIDO,
    ):
        raise exceptions.ChecklistNoModificable()

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

    if item.imagen and item.imagen.startswith("/checklist/imagenes/"):
        nombre = Path(item.imagen).name
        ruta = IMAGENES_DIR / nombre
        if ruta.is_file():
            try:
                ruta.unlink()
            except OSError:
                pass

    item.imagen = None
    db.commit()
    db.refresh(item)
    return item


def obtener_archivo_imagen(nombre_archivo: str) -> FileResponse:
    nombre_seguro = Path(nombre_archivo).name
    ruta = (IMAGENES_DIR / nombre_seguro).resolve()
    if not ruta.is_file() or not str(ruta).startswith(str(IMAGENES_DIR.resolve())):
        raise exceptions.ImagenNoEncontrada()
    return FileResponse(ruta)


def completar_tarea(
    db: Session,
    checklist_id: int,
    item_id: int,
    datos: schemas.CompletarTareaSchema,
) -> models.ChecklistItem:
    checklist = obtener_checklist(db, checklist_id)
    if checklist.estado in (
        models.EstadoGeneralChecklist.COMPLETADO,
        models.EstadoGeneralChecklist.VENCIDO,
    ):
        raise exceptions.ChecklistNoModificable()

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


def obtener_tarea(
    db: Session,
    checklist_id: int,
    item_id: int,
) -> models.ChecklistItem:
    item = db.scalar(
        select(models.ChecklistItem).where(
            models.ChecklistItem.id == item_id,
            models.ChecklistItem.checklist_id == checklist_id,
        )
    )
    if not item:
        raise exceptions.TareaChecklistNoEncontrada()
    return item



def listar_checklists(
    db: Session,
    fecha: Optional[date] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    estado: Optional[str] = None,
) -> List[models.Checklist]:
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise exceptions.RangoFechasInvalido()

    query = select(models.Checklist).order_by(models.Checklist.fecha.desc())
    if fecha:
        query = query.where(models.Checklist.fecha == fecha)
    if fecha_desde:
        query = query.where(models.Checklist.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(models.Checklist.fecha <= fecha_hasta)

    checklists = db.scalars(query).all()

    if estado:
        estado_lower = estado.lower()
        checklists = [c for c in checklists if c.estado.value == estado_lower]

    return checklists


def obtener_checklist(
    db: Session,
    checklist_id: int,
) -> models.Checklist:
    query = select(models.Checklist).where(models.Checklist.id == checklist_id)
    checklist = db.scalar(query)
    if not checklist:
        raise exceptions.ChecklistNoEncontrado()
    return checklist
