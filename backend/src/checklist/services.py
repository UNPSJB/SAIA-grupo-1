import json
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session
from src.checklist import exceptions, models, schemas
from src.auditoria.models import AccionAuditoria
from src.auditoria.schemas import AuditoriaCreate
from src.auditoria.services import registrar_auditoria
from src.equipos.models import Equipo, Estado
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.plan_De_limpieza.models import Plan_de_Limpieza
from src.tareas.models import Frecuencia
from src.insumos_quimicos.models import InsumoQuimico
from src.logger import get_logger
from src.autenticacion.dependencies import es_administrador
from src.exceptions import PermissionDenied

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

    if db is None or tarea_id is None:
        if frecuencia == Frecuencia.SEMANAL:
            return dias % 7 == 0
        elif frecuencia == Frecuencia.MENSUAL:
            return (fecha_checklist.day == fecha_inicio_plan.day) or (
                dias > 0 and dias % 30 == 0
            )
        return False

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
        return False

    if frecuencia == Frecuencia.SEMANAL:
        if ultima_fecha is None:
            return True
        dias_desde_ultima = (fecha_checklist - ultima_fecha).days
        ciclo_hoy = dias // 7
        ciclo_ultima = (ultima_fecha - fecha_inicio_plan).days // 7
        return dias_desde_ultima >= 7 or (ciclo_hoy > ciclo_ultima and dias_desde_ultima >= 4)

    elif frecuencia == Frecuencia.MENSUAL:
        if ultima_fecha is None:
            return True
        dias_desde_ultima = (fecha_checklist - ultima_fecha).days
        ciclo_hoy = dias // 30
        ciclo_ultima = (ultima_fecha - fecha_inicio_plan).days // 30
        return dias_desde_ultima >= 30 or (ciclo_hoy > ciclo_ultima and dias_desde_ultima >= 15)

    return False


def _tarea_esta_en_ciclo_reasignada_o_activa(
    db: Session,
    tarea_id: int,
    fecha: date,
    frecuencia: Frecuencia,
) -> bool:
    dias_limite = models.DIAS_POR_FRECUENCIA.get(frecuencia, 1)

    rp = db.scalar(
        select(models.ReasignacionPendiente).where(
            models.ReasignacionPendiente.tarea_id == tarea_id,
            models.ReasignacionPendiente.procesada == False,
        )
    )
    if rp is not None:
        if (fecha - rp.fecha_origen).days < dias_limite:
            return True

    items_reasignados = db.scalars(
        select(models.ChecklistItem)
        .join(models.Checklist, models.ChecklistItem.checklist_id == models.Checklist.id)
        .where(
            models.Checklist.activo == True,
            models.ChecklistItem.tarea_id == tarea_id,
            models.ChecklistItem.es_reasignada == True,
        )
    ).all()
    for it in items_reasignados:
        fecha_ref = it.fecha_original or (it.checklist.fecha if it.checklist else fecha)
        if (fecha - fecha_ref).days < dias_limite:
            return True

    return False


def generar_checklist(
    db: Session, datos: schemas.ChecklistGenerar
) -> models.Checklist:
    fecha = datos.fecha or date.today()
    if fecha > date.today():
        logger.warning("Intento de generar checklist con fecha futura: %s", fecha)
        raise exceptions.ChecklistFechaFutura()

    responsable = None
    if datos.responsable_legajo is not None:
        responsable = db.scalar(
            select(Personal).where(Personal.legajo == datos.responsable_legajo)
        )
    if not responsable:
        logger.warning("Generar checklist: responsable legajo %s no encontrado", datos.responsable_legajo)
        raise exceptions.ResponsableNoEncontrado()
    if not responsable.activo:
        logger.warning("Generar checklist: responsable legajo %s inactivo", datos.responsable_legajo)
        raise exceptions.ResponsableInactivo()

    ya_generado = db.scalar(
        select(models.Checklist.id).where(
            models.Checklist.fecha == fecha,
            models.Checklist.responsable_legajo == responsable.legajo,
        )
    )
    if ya_generado is not None:
        logger.warning("Generar checklist: legajo %s ya tiene checklist para %s", responsable.legajo, fecha)
        raise exceptions.ChecklistYaGenerado()

    planes = (
        db.scalars(
            select(Plan_de_Limpieza)
            .outerjoin(Equipo, Plan_de_Limpieza.equipo_id == Equipo.id)
            .where(
                Plan_de_Limpieza.fecha_inicio <= fecha,
                or_(
                    Plan_de_Limpieza.sector_id.isnot(None),
                    Equipo.estado == Estado.ACTIVO,
                ),
            )
        )
        .all()
    )

    items_a_crear: List[models.ChecklistItem] = []

    for plan in planes:
        for tarea in plan.tareas:
            if tarea.personal_id != datos.responsable_legajo:
                continue
            if _tarea_esta_en_ciclo_reasignada_o_activa(
                db, tarea.id, fecha, tarea.frecuencia
            ):
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
                item.historial.append(
                    models.ChecklistItemHistorial(
                        accion="CREADA",
                        detalle=f"Tarea programada como pendiente para {responsable.nombre} {responsable.apellido}",
                        usuario_legajo=responsable.legajo,
                        usuario_nombre=f"{responsable.nombre} {responsable.apellido}",
                    )
                )
                items_a_crear.append(item)

    reasignaciones_pendientes = db.scalars(
        select(models.ReasignacionPendiente).where(
            models.ReasignacionPendiente.nuevo_responsable_legajo == responsable.legajo,
            models.ReasignacionPendiente.procesada == False,
        )
    ).all()

    items_de_reasignacion: List[tuple[models.ReasignacionPendiente, models.ChecklistItem]] = []
    for r in reasignaciones_pendientes:
        dias_transcurridos = (fecha - r.fecha_origen).days
        dias_limite = models.DIAS_POR_FRECUENCIA.get(r.frecuencia, 1)
        if dias_transcurridos < dias_limite:
            nombre_anterior = (
                r.anterior_responsable_nombre
                or (f"Legajo {r.item_origen.responsable_legajo}" if r.item_origen and r.item_origen.responsable_legajo else "desconocido")
            )
            detalle_destino = f"Reasignada desde checklist #{r.checklist_origen_id} (anterior responsable: {nombre_anterior}) por {r.admin_nombre or 'Administrador'}"
            if r.motivo and r.motivo.strip():
                detalle_destino += f". Motivo: {r.motivo.strip()}"

            item_nuevo = models.ChecklistItem(
                plan_id=r.plan_id,
                nombre_plan=r.nombre_plan,
                tarea_id=r.tarea_id,
                nombre_tarea=r.nombre_tarea,
                descripcion_tarea=r.descripcion_tarea,
                frecuencia=r.frecuencia,
                _estado=models.EstadoTareaItem.PENDIENTE,
                responsable_legajo=responsable.legajo,
                insumos_utilizados="[]",
                fecha_hora_fin=None,
                fecha_original=r.fecha_origen,
                es_reasignada=True,
                revisada_por_operador=False,
                tarea_origen_id=r.item_origen_id,
            )
            item_nuevo.historial.append(
                models.ChecklistItemHistorial(
                    accion="CREADA_POR_REASIGNACION",
                    detalle=detalle_destino,
                    usuario_legajo=r.admin_legajo,
                    usuario_nombre=r.admin_nombre,
                )
            )
            items_a_crear.append(item_nuevo)
            items_de_reasignacion.append((r, item_nuevo))
        else:
            r.procesada = True

    if not items_a_crear:
        logger.warning("No hay tareas correspondientes para la fecha %s", fecha)
        raise exceptions.NoHayTareasCorrespondientes()

    tiene_reasignaciones = len(items_de_reasignacion) > 0
    checklist = models.Checklist(
        fecha=fecha,
        responsable_legajo=datos.responsable_legajo,
        activo=True,
        tiene_reasignacion_no_leida=tiene_reasignaciones,
        items=items_a_crear,
    )
    db.add(checklist)
    db.flush()

    for r, item_nuevo in items_de_reasignacion:
        r.procesada = True
        if r.item_origen:
            r.item_origen.tarea_reemplazo_id = item_nuevo.id

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

    if item.estado == models.EstadoTareaItem.NO_REALIZADO:
        raise exceptions.TareaYaJustificada()

    if item.estado == models.EstadoTareaItem.VENCIDO:
        raise exceptions.ChecklistNoModificable()


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

    if item.estado == models.EstadoTareaItem.NO_REALIZADO:
        raise exceptions.TareaYaJustificada()

    if item.estado == models.EstadoTareaItem.VENCIDO:
        raise exceptions.ChecklistNoModificable()


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

    if item.estado == models.EstadoTareaItem.NO_REALIZADO:
        raise exceptions.TareaYaJustificada()

    if item.estado == models.EstadoTareaItem.VENCIDO:
        raise exceptions.ChecklistNoModificable()


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
            try:
                from src.notificaciones.services import notificar_stock_bajo_quimico_si_corresponde
                notificar_stock_bajo_quimico_si_corresponde(db, quimico)
            except Exception:
                pass

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

    nombre_responsable = f"{responsable.nombre} {responsable.apellido}"
    detalle_comp = f"Completada por {nombre_responsable}"
    if insumos_guardados:
        ins_str = ", ".join(f"{x['nombre']} ({x['cantidad']} {x['unidad']})" for x in insumos_guardados)
        detalle_comp += f". Insumos: {ins_str}"

    item.historial.append(
        models.ChecklistItemHistorial(
            accion="COMPLETADA",
            detalle=detalle_comp,
            usuario_legajo=responsable.legajo,
            usuario_nombre=nombre_responsable,
        )
    )

    _auditar_cambios_item(db, item, previos)
    db.commit()
    logger.info("Tarea %s del checklist %s completada por legajo %s. Insumos descontados.", item_id, checklist_id, datos.responsable_legajo)
    db.refresh(item)
    return item


def marcar_tarea_no_realizada(
    db: Session,
    checklist_id: int,
    item_id: int,
    datos: schemas.MarcarNoRealizadaSchema,
    usuario_legajo: int,
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
        logger.warning("Marcar tarea no realizada: item %s no encontrado en checklist %s", item_id, checklist_id)
        raise exceptions.TareaChecklistNoEncontrada()

    if item.estado == models.EstadoTareaItem.REALIZADO:
        raise exceptions.TareaYaCompletada()

    if item.estado == models.EstadoTareaItem.NO_REALIZADO:
        raise exceptions.TareaYaJustificada()

    if item.estado == models.EstadoTareaItem.VENCIDO:
        raise exceptions.ChecklistNoModificable()


    responsable = db.scalar(
        select(Personal).where(Personal.legajo == usuario_legajo)
    )
    if not responsable:
        logger.warning("Marcar tarea no realizada %s: responsable legajo %s no encontrado", item_id, usuario_legajo)
        raise exceptions.ResponsableNoEncontrado()

    if not responsable.activo:
        logger.warning("Marcar tarea no realizada %s: responsable legajo %s inactivo", item_id, usuario_legajo)
        raise exceptions.ResponsableInactivo()

    if not datos.motivo:
        raise exceptions.MotivoNoRealizadoRequerido()

    motivo_str = str(getattr(datos.motivo, "value", datos.motivo)).strip()
    if motivo_str.lower() in ("otro", models.MotivoNoRealizado.OTRO.value):
        if not datos.observacion or not datos.observacion.strip():
            raise exceptions.ObservacionObligatoriaParaOtro()

    previos = {
        "estado": str(getattr(item.estado, "value", item.estado)),
        "motivo_no_realizado": str(getattr(item.motivo_no_realizado, "value", item.motivo_no_realizado)) if item.motivo_no_realizado else None,
        "observacion_no_realizado": item.observacion_no_realizado,
        "responsable_legajo": item.responsable_legajo,
    }

    item.estado = models.EstadoTareaItem.NO_REALIZADO
    item.motivo_no_realizado = motivo_str
    item.observacion_no_realizado = datos.observacion.strip() if datos.observacion else None
    item.responsable_legajo = usuario_legajo
    item.fecha_hora_no_realizado = datetime.now()

    nombre_responsable = f"{responsable.nombre} {responsable.apellido}"
    motivo_texto = str(getattr(datos.motivo, "value", datos.motivo))
    detalle_nr = f"Marcada como no realizada por {nombre_responsable}. Motivo: {motivo_texto}"
    if item.observacion_no_realizado:
        detalle_nr += f". Observación: {item.observacion_no_realizado}"

    item.historial.append(
        models.ChecklistItemHistorial(
            accion="NO_REALIZADA",
            detalle=detalle_nr,
            usuario_legajo=responsable.legajo,
            usuario_nombre=nombre_responsable,
        )
    )

    _auditar_cambios_item(db, item, previos)
    db.commit()
    logger.info("Tarea %s del checklist %s marcada como no realizada (motivo: %s) por legajo %s", item_id, checklist_id, datos.motivo, usuario_legajo)
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


def listar_tareas_no_realizadas_reasignables(
    db: Session,
) -> List[models.ChecklistItem]:
    query = (
        select(models.ChecklistItem)
        .join(models.Checklist, models.ChecklistItem.checklist_id == models.Checklist.id)
        .where(
            models.Checklist.activo == True,
            models.ChecklistItem._estado == models.EstadoTareaItem.NO_REALIZADO,
            models.ChecklistItem.tarea_reemplazo_id.is_(None),
        )
        .order_by(models.Checklist.fecha.desc(), models.ChecklistItem.id.desc())
    )
    items = list(db.scalars(query).all())
    hoy = date.today()
    reasignables = []
    for item in items:
        fecha_ref = item.fecha_original or (item.checklist.fecha if item.checklist else hoy)
        dias_transcurridos = (hoy - fecha_ref).days
        dias_limite = models.DIAS_POR_FRECUENCIA.get(item.frecuencia, 1)
        if dias_transcurridos < dias_limite:
            reasignables.append(item)
    return reasignables


def obtener_checklist(
    db: Session,
    checklist_id: int,
    usuario: Optional[Personal] = None,
) -> models.Checklist:
    query = select(models.Checklist).where(models.Checklist.id == checklist_id)
    checklist = db.scalar(query)
    if not checklist:
        raise exceptions.ChecklistNoEncontrado()

    if (
        usuario
        and usuario.legajo == checklist.responsable_legajo
        and checklist.tiene_reasignacion_no_leida
    ):
        checklist.tiene_reasignacion_no_leida = False
        for it in checklist.items:
            if it.es_reasignada and not it.revisada_por_operador:
                it.revisada_por_operador = True
        db.commit()
        db.refresh(checklist)

    return checklist


def reasignar_tarea(
    db: Session,
    checklist_id: int,
    item_id: int,
    datos: schemas.ReasignarTareaSchema,
    admin_usuario: Personal,
) -> models.ChecklistItem:
    if not es_administrador(admin_usuario):
        raise PermissionDenied()

    checklist_origen = obtener_checklist(db, checklist_id)
    item_origen = obtener_tarea(db, checklist_id, item_id)

    dias_transcurridos = (
        date.today() - (item_origen.fecha_original or checklist_origen.fecha)
    ).days
    dias_limite = models.DIAS_POR_FRECUENCIA.get(item_origen.frecuencia, 1)
    if item_origen.estado == models.EstadoTareaItem.VENCIDO or dias_transcurridos >= dias_limite:
        raise exceptions.TareaVencidaNoReasignable()

    if item_origen.estado not in (
        models.EstadoTareaItem.PENDIENTE,
        models.EstadoTareaItem.NO_REALIZADO,
    ):
        raise exceptions.TareaNoReasignablePorEstado()

    nuevo_operador = db.scalar(
        select(Personal).where(Personal.legajo == datos.nuevo_responsable_legajo)
    )
    if not nuevo_operador:
        raise exceptions.ResponsableNoEncontrado()

    if not nuevo_operador.activo:
        raise exceptions.ResponsableInactivo()

    if nuevo_operador.capacidad not in (Capacidades.OPERAR, Capacidades.AMBAS):
        raise exceptions.OperadorDestinoNoOperador()

    es_mismo_operador = nuevo_operador.legajo == checklist_origen.responsable_legajo
    if es_mismo_operador:
        if item_origen.estado != models.EstadoTareaItem.NO_REALIZADO:
            raise exceptions.ReasignarMismoOperadorSoloNoRealizada()

    hoy = date.today()
    checklist_destino = db.scalar(
        select(models.Checklist).where(
            models.Checklist.fecha == hoy,
            models.Checklist.responsable_legajo == nuevo_operador.legajo,
            models.Checklist.activo == True,
        )
    )
    tiene_checklist_pendiente_hoy = bool(
        checklist_destino
        and checklist_destino.estado == models.EstadoGeneralChecklist.PENDIENTE
    )
    se_vence_hoy = dias_transcurridos >= dias_limite - 1
    es_diaria = item_origen.frecuencia == Frecuencia.DIARIA

    if not tiene_checklist_pendiente_hoy:
        if es_diaria:
            raise exceptions.OperadorDestinoSinChecklistPendiente()
        if se_vence_hoy:
            raise exceptions.TareaVenceHoyRequiereChecklistPendiente()

    previos = {
        "estado": item_origen.estado.value if hasattr(item_origen.estado, "value") else str(item_origen.estado),
        "responsable_legajo": item_origen.responsable_legajo,
    }

    item_origen.estado = models.EstadoTareaItem.REASIGNADO

    nombre_admin = (
        f"{admin_usuario.nombre} {admin_usuario.apellido}".strip()
        if hasattr(admin_usuario, "nombre") and hasattr(admin_usuario, "apellido") and admin_usuario.nombre
        else f"Usuario #{admin_usuario.legajo}"
    )
    nombre_nuevo = f"{nuevo_operador.nombre} {nuevo_operador.apellido}"
    detalle_origen = f"Reasignada a {nombre_nuevo} (Legajo {nuevo_operador.legajo}) por {nombre_admin}"
    if datos.motivo and datos.motivo.strip():
        detalle_origen += f". Motivo: {datos.motivo.strip()}"

    item_origen.historial.append(
        models.ChecklistItemHistorial(
            accion="REASIGNADA",
            detalle=detalle_origen,
            usuario_legajo=admin_usuario.legajo,
            usuario_nombre=nombre_admin,
        )
    )
    _auditar_cambios_item(db, item_origen, previos)

    nombre_anterior = item_origen.nombre_responsable or f"Legajo {checklist_origen.responsable_legajo}"

    if tiene_checklist_pendiente_hoy and checklist_destino is not None:
        detalle_destino = f"Reasignada desde checklist #{checklist_origen.id} (anterior responsable: {nombre_anterior}) por {nombre_admin}"
        if datos.motivo and datos.motivo.strip():
            detalle_destino += f". Motivo: {datos.motivo.strip()}"

        item_nuevo = models.ChecklistItem(
            checklist_id=checklist_destino.id,
            plan_id=item_origen.plan_id,
            nombre_plan=item_origen.nombre_plan,
            tarea_id=item_origen.tarea_id,
            nombre_tarea=item_origen.nombre_tarea,
            descripcion_tarea=item_origen.descripcion_tarea,
            frecuencia=item_origen.frecuencia,
            _estado=models.EstadoTareaItem.PENDIENTE,
            responsable_legajo=nuevo_operador.legajo,
            insumos_utilizados="[]",
            fecha_hora_fin=None,
            fecha_original=item_origen.fecha_original or checklist_origen.fecha,
            es_reasignada=True,
            revisada_por_operador=False,
            tarea_origen_id=item_origen.id,
        )
        item_nuevo.historial.append(
            models.ChecklistItemHistorial(
                accion="CREADA_POR_REASIGNACION",
                detalle=detalle_destino,
                usuario_legajo=admin_usuario.legajo,
                usuario_nombre=nombre_admin,
            )
        )
        db.add(item_nuevo)
        db.flush()

        item_origen.tarea_reemplazo_id = item_nuevo.id
        checklist_destino.tiene_reasignacion_no_leida = True

        db.commit()
        db.refresh(item_origen)
        db.refresh(checklist_destino)
        return item_origen
    else:
        reasignacion = models.ReasignacionPendiente(
            item_origen_id=item_origen.id,
            checklist_origen_id=checklist_origen.id,
            nuevo_responsable_legajo=nuevo_operador.legajo,
            plan_id=item_origen.plan_id,
            nombre_plan=item_origen.nombre_plan,
            tarea_id=item_origen.tarea_id,
            nombre_tarea=item_origen.nombre_tarea,
            descripcion_tarea=item_origen.descripcion_tarea,
            frecuencia=item_origen.frecuencia,
            fecha_origen=item_origen.fecha_original or checklist_origen.fecha,
            motivo=datos.motivo.strip() if datos.motivo and datos.motivo.strip() else None,
            admin_legajo=admin_usuario.legajo,
            admin_nombre=nombre_admin,
            anterior_responsable_nombre=nombre_anterior,
            procesada=False,
        )
        db.add(reasignacion)
        db.commit()
        db.refresh(item_origen)
        return item_origen