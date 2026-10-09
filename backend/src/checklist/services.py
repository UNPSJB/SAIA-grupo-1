import json
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from src.checklist import exceptions, models, schemas
from src.auditoria.models import AccionAuditoria
from src.auditoria.schemas import AuditoriaCreate
from src.auditoria.services import registrar_auditoria
from src.equipos.models import Equipo, Estado
from src.personal.models import Personal
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.tareas.models import Frecuencia
from src.insumos_quimicos.models import InsumoQuimico
from src.logger import get_logger

logger = get_logger(__name__)

TABLA_CHECKLIST = "checklists"
TABLA_CHECKLIST_ITEM = "checklist_items"


def _auditar(
    db: Session,
    tabla: str,
    registro_id: int,
    accion: AccionAuditoria,
    campo: Optional[str] = None,
    previo=None,
    posterior=None,
) -> None:
    registrar_auditoria(
        db,
        AuditoriaCreate(
            tabla=tabla,
            registro_id=registro_id,
            accion=accion,
            campo=campo,
            valor_previo=None if previo is None else str(previo),
            valor_posterior=None if posterior is None else str(posterior),
        ),
        commit=False,
    )


IMAGENES_DIR = Path(__file__).resolve().parent / "imagenes"
IMAGENES_DIR.mkdir(parents=True, exist_ok=True)


def tarea_corresponde_a_fecha(
    frecuencia: Frecuencia,
    fecha_inicio_plan: date,
    fecha_checklist: date,
    db: Optional[Session] = None,
    tarea_id: Optional[int] = None,
) -> bool:
    if fecha_checklist < fecha_inicio_plan:
        return False

    if frecuencia == Frecuencia.DIARIA:
        return True

    dias = (fecha_checklist - fecha_inicio_plan).days

    # Si no se pasó db o tarea_id (p. ej. en invocaciones aisladas de pruebas), se usa cálculo clásico
    if db is None or tarea_id is None:
        if frecuencia == Frecuencia.SEMANAL:
            return dias % 7 == 0
        elif frecuencia == Frecuencia.MENSUAL:
            return (fecha_checklist.day == fecha_inicio_plan.day) or (
                dias > 0 and dias % 30 == 0
            )
        return False

    # Buscamos la última fecha en que esta tarea fue generada en un checklist activo hasta fecha_checklist
    ultima_fecha = db.scalar(
        select(func.max(models.Checklist.fecha))
        .join(models.ChecklistItem, models.ChecklistItem.checklist_id == models.Checklist.id)
        .where(
            models.Checklist.activo == True,
            models.ChecklistItem.tarea_id == tarea_id,
            models.Checklist.fecha <= fecha_checklist,
        )
    )

    if ultima_fecha is not None and ultima_fecha == fecha_checklist:
        # Ya está incluida en un checklist generado para esta misma fecha
        return False

    if frecuencia == Frecuencia.SEMANAL:
        if ultima_fecha is None:
            # Nunca se generó aún para este plan activo: corresponde generarla
            return True
        dias_desde_ultima = (fecha_checklist - ultima_fecha).days
        ciclo_hoy = dias // 7
        ciclo_ultima = (ultima_fecha - fecha_inicio_plan).days // 7
        # Corresponde si pasaron 7 o más días, o si estamos en un ciclo semanal posterior con al menos 4 días de separación
        return dias_desde_ultima >= 7 or (ciclo_hoy > ciclo_ultima and dias_desde_ultima >= 4)

    elif frecuencia == Frecuencia.MENSUAL:
        if ultima_fecha is None:
            return True
        dias_desde_ultima = (fecha_checklist - ultima_fecha).days
        ciclo_hoy = dias // 30
        ciclo_ultima = (ultima_fecha - fecha_inicio_plan).days // 30
        return dias_desde_ultima >= 30 or (ciclo_hoy > ciclo_ultima and dias_desde_ultima >= 15)

    return False


def generar_checklist(
    db: Session, datos: schemas.ChecklistGenerar
) -> models.Checklist:
    fecha = datos.fecha or date.today()
    if fecha > date.today():
        logger.warning("Intento de generar checklist con fecha futura: %s", fecha)
        raise exceptions.ChecklistFechaFutura()

    responsable = db.scalar(
        select(Personal).where(Personal.legajo == datos.responsable_legajo)
    )
    if not responsable:
        logger.warning("Generar checklist: responsable legajo %s no encontrado", datos.responsable_legajo)
        raise exceptions.ResponsableNoEncontrado()
    if not responsable.activo:
        logger.warning("Generar checklist: responsable legajo %s inactivo", datos.responsable_legajo)
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
            # cada persona genera su checklist solo con las tareas que tiene asignadas
            if tarea.personal_id != datos.responsable_legajo:
                continue
            if tarea_corresponde_a_fecha(
                tarea.frecuencia,
                plan.fecha_inicio,
                fecha,
                db=db,
                tarea_id=tarea.id,
            ):
                item = models.ChecklistItem(
                    plan_id=plan.id,
                    nombre_plan=plan.nombre,
                    tarea_id=tarea.id,
                    nombre_tarea=tarea.nombre,
                    descripcion_tarea=tarea.descripcion,
                    frecuencia=tarea.frecuencia,
                    estado=models.EstadoTareaItem.PENDIENTE,
                    responsable_legajo=tarea.personal_id,
                )
                items_a_crear.append(item)

    if not items_a_crear:
        logger.warning("No hay tareas correspondientes para la fecha %s", fecha)
        raise exceptions.NoHayTareasCorrespondientes()

    checklist = models.Checklist(
        fecha=fecha,
        responsable_legajo=datos.responsable_legajo,
        activo=True,
        items=items_a_crear,
    )
    db.add(checklist)
    db.flush()
    _auditar(
        db,
        TABLA_CHECKLIST,
        checklist.id,
        AccionAuditoria.CREAR,
        campo="fecha",
        posterior=checklist.fecha,
    )
    db.commit()
    db.refresh(checklist)
    logger.info("Checklist %s generado para fecha %s (%d tareas)", checklist.id, checklist.fecha, len(checklist.items))
    return checklist


def _auditar_cambios_item(
    db: Session, item: models.ChecklistItem, previos: dict
) -> None:
    for campo, previo in previos.items():
        posterior = getattr(item, campo)
        if posterior != previo:
            _auditar(
                db,
                TABLA_CHECKLIST_ITEM,
                item.id,
                AccionAuditoria.MODIFICAR,
                campo=campo,
                previo=previo,
                posterior=posterior,
            )


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

    imagen_previa = item.imagen
    item.imagen = f"/checklist/imagenes/{nombre_nuevo}"
    _auditar_cambios_item(db, item, {"imagen": imagen_previa})
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

    imagen_previa = item.imagen
    item.imagen = None
    _auditar_cambios_item(db, item, {"imagen": imagen_previa})
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
        logger.warning("Completar tarea: item %s no encontrado en checklist %s", item_id, checklist_id)
        raise exceptions.TareaChecklistNoEncontrada()

    if item.estado == models.EstadoTareaItem.REALIZADO:
        raise exceptions.TareaYaCompletada()

    responsable = db.scalar(
        select(Personal).where(Personal.legajo == datos.responsable_legajo)
    )
    if not responsable:
        logger.warning("Completar tarea %s: responsable legajo %s no encontrado", item_id, datos.responsable_legajo)
        raise exceptions.ResponsableNoEncontrado()

    if not responsable.activo:
        logger.warning("Completar tarea %s: responsable legajo %s inactivo", item_id, datos.responsable_legajo)
        raise exceptions.ResponsableInactivo()

    insumos_guardados = []
    if datos.insumos_utilizados:
        for insumo_dto in datos.insumos_utilizados:
            if insumo_dto.id:
                quimico: Optional[InsumoQuimico] = db.scalar(
                    select(InsumoQuimico).where(InsumoQuimico.id == insumo_dto.id)
                )
            else:
                nombre_limpio = insumo_dto.nombre.strip().lower()
                quimico = db.scalar(
                    select(InsumoQuimico).where(func.lower(InsumoQuimico.nombre) == nombre_limpio)
                )
                if not quimico:
                    quimico = db.scalar(
                        select(InsumoQuimico).where(func.lower(InsumoQuimico.nombre).contains(nombre_limpio))
                    )

            if not quimico:
                raise exceptions.InsumoQuimicoNoEncontrado()

            if not bool(getattr(quimico, "activo", True)):
                raise exceptions.InsumoQuimicoInactivo()

            if insumo_dto.cantidad <= 0:
                raise exceptions.CantidadConsumoInvalida()

            stock_previo = float(getattr(quimico, "stock_actual", 0.0))
            nuevo_stock = max(0.0, round(stock_previo - float(insumo_dto.cantidad), 2))
            setattr(quimico, "stock_actual", nuevo_stock)

            unidad_valor = getattr(quimico, "unidad_medida", None)
            unidad_str = str(getattr(unidad_valor, "value", unidad_valor or "L"))

            insumos_guardados.append({
                "id": getattr(quimico, "id", None),
                "nombre": str(getattr(quimico, "nombre", "")),
                "cantidad": float(insumo_dto.cantidad),
                "unidad": unidad_str,
            })

    previos = {
        "estado": item.estado,
        "responsable_legajo": item.responsable_legajo,
        "insumos_utilizados": item.insumos_utilizados,
    }

    item.responsable_legajo = datos.responsable_legajo
    item.insumos_utilizados = json.dumps(insumos_guardados, ensure_ascii=False) if insumos_guardados else "[]"
    item.estado = models.EstadoTareaItem.REALIZADO
    item.fecha_hora_fin = datetime.now()

    _auditar_cambios_item(db, item, previos)
    db.commit()
    logger.info("Tarea %s del checklist %s completada por legajo %s. Insumos descontados.", item_id, checklist_id, datos.responsable_legajo)
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
        logger.warning("Obtener tarea: item %s no encontrado en checklist %s", item_id, checklist_id)
        raise exceptions.TareaChecklistNoEncontrada()
    return item


def listar_checklists(
    db: Session,
    fecha: Optional[date] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    estado: Optional[str] = None,
    responsable_legajo: Optional[int] = None,
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
    if responsable_legajo is not None:
        query = query.where(models.Checklist.responsable_legajo == responsable_legajo)

    checklists: List[models.Checklist] = list(db.scalars(query).all())

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