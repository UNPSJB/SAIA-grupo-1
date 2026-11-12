from datetime import date, datetime
import logging
from typing import List, Literal, Optional
from sqlalchemy import Sequence, delete, select, update
from sqlalchemy.orm import Session
from src.autenticacion.dependencies import es_operador
from src.personal.models import Personal
from src.recetas.models import Receta, VersionReceta, RecetaDetalle, ChecklistReceta, ChecklistRecetaItem, EstadoEtapaRecetaItem, EstadoGeneralRecetaChecklist
from src.personal.schemas import Capacidades
from src.recetas import schemas, exceptions




def es_administrador(persona: Personal) -> bool:
    return persona.capacidad in (Capacidades.ADMINISTRAR, Capacidades.AMBAS)

def obtener_descripcion_personal(persona) -> str:
    if not persona:
        return "Desconocido"
    legajo = getattr(persona, "legajo", "")
    nombre = getattr(persona, "nombre", "")
    apellido = getattr(persona, "apellido", "")
    usuario = getattr(persona, "usuario", None)
    desc = f"{legajo} - {nombre} {apellido}".strip()
    if usuario:
        desc += f" (@{usuario})"
    return desc

def verificar_permiso_administrador(
    db: Session,
    responsable_legajo: Optional[int] = None,
    usuario: Optional[Personal] = None,
) -> Personal:
    if responsable_legajo is not None:
        persona = db.scalar(select(Personal).where(Personal.legajo == responsable_legajo))
        if not persona:
            raise exceptions.ResponsableNoEncontrado()
        if not persona.activo:
            raise exceptions.ResponsableInactivo()
        if not es_administrador(persona):
            raise exceptions.SoloAdministradorPuedeSubir()
        return persona

    if usuario is not None:
        if not getattr(usuario, "activo", True):
            raise exceptions.ResponsableInactivo()
        if not es_administrador(usuario):
            raise exceptions.SoloAdministradorPuedeSubir()
        if isinstance(usuario, Personal):
            return usuario
        if hasattr(usuario, "legajo"):
            persona_db = db.scalar(select(Personal).where(Personal.legajo == usuario.legajo))
            if persona_db:
                return persona_db
        return usuario

    persona = db.scalar(
        select(Personal).where(
            Personal.activo == True,
            Personal.capacidad.in_([Capacidades.ADMINISTRAR, Capacidades.AMBAS]),
        )
    )
    if not persona:
        raise exceptions.SoloAdministradorPuedeSubir()
    return persona

def calcular_siguiente_version(versiones: Sequence[VersionReceta]) -> int:
    if not versiones:
        return 1
    numeros = []
    for v in versiones:
        try:
            numeros.append(int(v.version))
        except (ValueError, TypeError):
            pass
    if numeros:
        return max(numeros) + 1
    return len(versiones) + 1


def crear_receta(db: Session, receta_data: schemas.RecetaCreate, usuario: Personal) -> Receta:
    datos = receta_data.model_dump()
    detalles_data = datos.pop("detalles", [])

    if not detalles_data:
        raise exceptions.AgregueIngredientes()
    
    # Como model_dump() convierte los sub-modelos en dicts, evaluamos con ["es_aditivo"]
    tiene_ingrediente = any(not d["es_aditivo"] for d in detalles_data)
    if not tiene_ingrediente:
        raise exceptions.AgregueIngredientes()


    fecha_vigencia = datos.pop("fecha_vigencia", None)
    fecha_vencimiento = datos.pop("fecha_vencimiento", None)

    _receta = Receta(**datos)
    db.add(_receta)
    db.flush() # Para obtener _receta.id

    #  Creamos la Versión 1 asociada
    nueva_version = VersionReceta(
        receta_id=_receta.id,
        version=1,
        rendimiento_final=_receta.rendimiento_final,
        archivado=False,
        es_vigente=True,
        fecha_vigencia=fecha_vigencia,
        fecha_vencimiento=fecha_vencimiento,
        creado_por_legajo=getattr(usuario, "legajo", None),
        creado_por_usuario=getattr(usuario, "usuario", None),
    )
    db.add(nueva_version)
    db.flush() # Para obtener nueva_version.id

    # Iteramos y creamos los detalles asignándoles el ID de la versión
    for detalle in detalles_data:
        validar_operario_etapa(db, detalle["operario_legajo"])
        detalle["version_receta_id"] = nueva_version.id
        nuevo_detalle = RecetaDetalle(**detalle)
        db.add(nuevo_detalle)

    db.commit()
    db.refresh(_receta)
    return _receta


def obtener_receta(db: Session, receta_id: int, usuario: Personal) -> Receta:
    db_receta = db.scalar(select(Receta).where(Receta.id == receta_id))
    if db_receta is None:
        raise exceptions.RecetaNoEncontrada()
    return db_receta


def editar_receta(db: Session, receta_id: int, receta_data: schemas.RecetaUpdate, usuario: Personal) -> Receta:
    db_receta = obtener_receta(db, receta_id, usuario)
    datos = receta_data.model_dump(exclude_unset=True)
    detalles_data = datos.pop("detalles", None)

    if detalles_data is not None:
        if not detalles_data:
            raise exceptions.AgregueIngredientes()
        tiene_ingrediente = any(not d["es_aditivo"] for d in detalles_data)
        if not tiene_ingrediente:
            raise exceptions.AgregueIngredientes()

    # Extraer fechas si vienen en la actualización
    fecha_vigencia = datos.pop("fecha_vigencia", None)
    fecha_vencimiento = datos.pop("fecha_vencimiento", None)

    # 1. Actualizar los datos generales de la receta (ej. nombre)
    if datos:
        db.execute(
            update(Receta).where(Receta.id == receta_id).values(**datos)
        )
        db.flush()

    # 2. PATRÓN DE VERSIONADO: Desactivar la versión vigente actual (dejarla en solo lectura)
    version_anterior = db.scalar(
        select(VersionReceta).where(
            VersionReceta.receta_id == receta_id,
            VersionReceta.es_vigente == True
        )
    )
    if version_anterior:
        version_anterior.es_vigente = False
        db.add(version_anterior)

    # 3. Calcular el número de la nueva versión
    db.refresh(db_receta)
    siguiente_version = calcular_siguiente_version(db_receta.versiones)

    # 4. Obtener el rendimiento actual (del update o el último conocido)
    rendimiento_actual = datos.get("rendimiento_final", db_receta.rendimiento_final)

    # 5. Crear la NUEVA versión de la receta
    nueva_version = VersionReceta(
        receta_id=receta_id,
        version=siguiente_version,
        rendimiento_final=rendimiento_actual,
        archivado=False,
        es_vigente=True,
        fecha_vigencia=fecha_vigencia,
        fecha_vencimiento=fecha_vencimiento,
        creado_por_legajo=getattr(usuario, "legajo", None),
        creado_por_usuario=getattr(usuario, "usuario", None),
    )
    db.add(nueva_version)
    db.flush()  # Para obtener el ID de la nueva versión

    # 6. Agregar los nuevos detalles vinculados EXCLUSIVAMENTE a esta nueva versión
    if detalles_data is not None:
        for detalle in detalles_data:
            validar_operario_etapa(db, detalle["operario_legajo"])
            detalle["version_receta_id"] = nueva_version.id
            nuevo_detalle = RecetaDetalle(**detalle)
            db.add(nuevo_detalle)

    db.commit()
    db.refresh(db_receta)
    return db_receta



def listar_versiones_receta(db: Session, receta_id: int) -> List[VersionReceta]:
    db_receta = obtener_receta(db, receta_id, usuario=None)
    return db_receta.versiones


def listar_recetas(db: Session, usuario: Personal) -> List[Receta]:
    return list(db.scalars(select(Receta)).all())


def validar_operario_etapa(db: Session, legajo: int) -> Personal:
    """Verifica que el responsable de la etapa exista, esté activo y tenga capacidad de operar."""
    persona = db.scalar(select(Personal).where(Personal.legajo == legajo))
    if persona is None:
        raise exceptions.ResponsableNoEncontrado()
    if not persona.activo:
        raise exceptions.ResponsableInactivo()
    if not es_operador(persona):
        raise exceptions.PersonalNoOperador()
    return persona


def generar_checklist_receta(
    db: Session, datos: schemas.ChecklistRecetaGenerar
) -> ChecklistReceta:
    fecha = datos.fecha or date.today()
    if fecha != date.today():
        raise exceptions.ChecklistFechaInvalida()

    responsable = validar_operario_etapa(db, datos.responsable_legajo)

    ya_generado = db.scalar(
        select(ChecklistReceta.id).where(
            ChecklistReceta.fecha == fecha,
            ChecklistReceta.responsable_legajo == responsable.legajo,
        )
    )
    if ya_generado is not None:
        raise exceptions.ChecklistYaGenerado()

    recetas_activas = db.scalars(
        select(Receta).where(Receta.activo == True)
    ).all()

    items_a_crear: List[ChecklistRecetaItem] = []

    for receta in recetas_activas:
        version_vig = receta.version_vigente
        if not version_vig:
            continue

        for detalle in version_vig.detalles:
            if detalle.operario_legajo != responsable.legajo:
                continue

            item = ChecklistRecetaItem(
                receta_id=receta.id,
                version_receta_id=version_vig.id,
                nombre_receta=receta.nombre,
                detalle_id=detalle.id,
                nombre_etapa=detalle.nombre,
                descripcion_pasos=detalle.descripcion_pasos,
                ingrediente_id=detalle.ingrediente_id,
                cantidad=detalle.cantidad,
                unidad_medida=detalle.unidad_medida,
                estado=EstadoEtapaRecetaItem.PENDIENTE,
                responsable_legajo=responsable.legajo,
            )
            items_a_crear.append(item)

    if not items_a_crear:
        raise exceptions.NoHayEtapasAsignadas()

    checklist = ChecklistReceta(
        fecha=fecha,
        responsable_legajo=responsable.legajo,
        activo=True,
        items=items_a_crear,
    )
    db.add(checklist)
    db.commit()
    db.refresh(checklist)
    return checklist


def listar_checklists_receta(
    db: Session,
    fecha: Optional[date] = None,
    estado: Optional[str] = None,
    responsable_legajo: Optional[int] = None,
) -> List[ChecklistReceta]:
    query = select(ChecklistReceta).order_by(ChecklistReceta.fecha.desc())
    if fecha:
        query = query.where(ChecklistReceta.fecha == fecha)
    if responsable_legajo is not None:
        query = query.where(ChecklistReceta.responsable_legajo == responsable_legajo)

    checklists = list(db.scalars(query).all())
    if estado:
        estado_lower = estado.lower()
        checklists = [c for c in checklists if c.estado.value == estado_lower]
    return checklists


def obtener_checklist_receta(db: Session, checklist_id: int) -> ChecklistReceta:
    checklist = db.scalar(
        select(ChecklistReceta).where(ChecklistReceta.id == checklist_id)
    )
    if not checklist:
        raise exceptions.ChecklistNoEncontrado()
    return checklist


def obtener_etapa_checklist(
    db: Session, checklist_id: int, item_id: int
) -> ChecklistRecetaItem:
    item = db.scalar(
        select(ChecklistRecetaItem).where(
            ChecklistRecetaItem.id == item_id,
            ChecklistRecetaItem.checklist_id == checklist_id,
        )
    )
    if not item:
        raise exceptions.EtapaChecklistNoEncontrada()
    return item


def completar_etapa_checklist(
    db: Session,
    checklist_id: int,
    item_id: int,
    operario_legajo: int,
    datos: Optional[schemas.CompletarEtapaSchema] = None,
) -> ChecklistRecetaItem:
    checklist = obtener_checklist_receta(db, checklist_id)
    if checklist.estado in (
        EstadoGeneralRecetaChecklist.COMPLETADO,
        EstadoGeneralRecetaChecklist.VENCIDO,
    ):
        raise exceptions.ChecklistNoModificable()

    item = obtener_etapa_checklist(db, checklist_id, item_id)
    if item.estado != EstadoEtapaRecetaItem.PENDIENTE:
        raise exceptions.EtapaYaCompletada()

    validar_operario_etapa(db, operario_legajo)

    item.estado = EstadoEtapaRecetaItem.REALIZADO
    item.responsable_legajo = operario_legajo
    item.fecha_hora_fin = datetime.now()
    if datos and datos.observaciones:
        item.observaciones = datos.observaciones.strip()

    db.commit()
    db.refresh(item)
    return item


def marcar_etapa_no_realizada(
    db: Session,
    checklist_id: int,
    item_id: int,
    datos: schemas.MarcarEtapaNoRealizadaSchema,
    operario_legajo: int,
) -> ChecklistRecetaItem:
    checklist = obtener_checklist_receta(db, checklist_id)
    if checklist.estado in (
        EstadoGeneralRecetaChecklist.COMPLETADO,
        EstadoGeneralRecetaChecklist.VENCIDO,
    ):
        raise exceptions.ChecklistNoModificable()

    item = obtener_etapa_checklist(db, checklist_id, item_id)
    if item.estado != EstadoEtapaRecetaItem.PENDIENTE:
        raise exceptions.EtapaYaCompletada()

    validar_operario_etapa(db, operario_legajo)

    item.estado = EstadoEtapaRecetaItem.NO_REALIZADO
    item.motivo_no_realizado = datos.motivo.strip()
    item.observacion_no_realizado = (
        datos.observacion.strip() if datos.observacion else None
    )
    item.responsable_legajo = operario_legajo
    item.fecha_hora_no_realizado = datetime.now()

    db.commit()
    db.refresh(item)
    return item