from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.certificado.models import Certificado
from src.config import settings
from src.documentos.models import Documento
from src.elementosDeLimpieza.models import ElementoDeLimpieza
from src.insumos_quimicos.constants import UnidadMedidaEnum
from src.insumos_quimicos.models import InsumoQuimico
from src.notificaciones import exceptions, schemas
from src.notificaciones.constants import TipoNotificacion
from src.notificaciones.models import Notificacion
from src.personal.models import Personal
from src.personal.schemas import Capacidades
from src.plan_de_calibracion.models import Plan_de_Calibracion
from src.tareas.models import Tarea


def _a_fecha(valor: date | datetime) -> date:
    if isinstance(valor, datetime):
        return valor.date()
    return valor


def _describir_plazo(dias: int) -> str:
    if dias < 0:
        dias_abs = abs(dias)
        return f"venció hace {dias_abs} {'día' if dias_abs == 1 else 'días'}"
    if dias == 0:
        return "vence hoy"
    return f"vence en {dias} {'día' if dias == 1 else 'días'}"


def crear_notificacion(
    db: Session, data: schemas.NotificacionCreate
) -> tuple[Notificacion, bool]:
    if data.clave_duplicado:
        existente = (
            db.query(Notificacion)
            .filter(
                Notificacion.usuario_id == data.usuario_id,
                Notificacion.clave_duplicado == data.clave_duplicado,
            )
            .first()
        )
        if existente:
            return existente, False

    notif = Notificacion(
        usuario_id=data.usuario_id,
        titulo=data.titulo,
        mensaje=data.mensaje,
        tipo=data.tipo,
        fecha=datetime.now(),
        leida=False,
        entidad_tipo=data.entidad_tipo,
        entidad_id=data.entidad_id,
        clave_duplicado=data.clave_duplicado,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif, True


def crear_notificacion_para_admins(
    db: Session,
    titulo: str,
    mensaje: str,
    tipo: str,
    entidad_tipo: Optional[str] = None,
    entidad_id: Optional[int] = None,
    clave_base: Optional[str] = None,
) -> tuple[List[Notificacion], int]:
    admins = (
        db.query(Personal)
        .filter(
            Personal.activo == True,  # noqa: E712
            Personal.capacidad.in_([Capacidades.ADMINISTRAR, Capacidades.AMBAS]),
        )
        .all()
    )

    resultados: List[Notificacion] = []
    nuevas_creadas = 0
    for admin in admins:
        clave = f"{clave_base}_{admin.legajo}" if clave_base else None
        data = schemas.NotificacionCreate(
            usuario_id=admin.legajo,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            entidad_tipo=entidad_tipo,
            entidad_id=entidad_id,
            clave_duplicado=clave,
        )
        n, creada = crear_notificacion(db, data)
        resultados.append(n)
        if creada:
            nuevas_creadas += 1
    return resultados, nuevas_creadas


def marcar_leida(
    db: Session, notificacion_id: int, usuario_legajo: int
) -> Notificacion:
    notif = (
        db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    )
    if notif is None:
        raise exceptions.NotificacionNoEncontrada()
    if notif.usuario_id != usuario_legajo:
        raise exceptions.NotificacionNoAutorizada()

    if not notif.leida:
        notif.leida = True
        notif.leida_el = datetime.now()
        db.commit()
        db.refresh(notif)
    return notif


def marcar_todas_leidas(db: Session, usuario_legajo: int) -> int:
    ahora = datetime.now()
    filas_afectadas = (
        db.query(Notificacion)
        .filter(
            Notificacion.usuario_id == usuario_legajo,
            Notificacion.leida == False,  # noqa: E712
        )
        .update({"leida": True, "leida_el": ahora}, synchronize_session=False)
    )
    db.commit()
    return filas_afectadas


def listar_notificaciones(
    db: Session,
    usuario_legajo: int,
    solo_no_leidas: bool = False,
    limite: int = 50,
) -> tuple[List[Notificacion], int, int]:
    q = db.query(Notificacion).filter(Notificacion.usuario_id == usuario_legajo)
    total_registros = q.count()
    total_no_leidas = (
        db.query(Notificacion)
        .filter(
            Notificacion.usuario_id == usuario_legajo,
            Notificacion.leida == False,  # noqa: E712
        )
        .count()
    )

    if solo_no_leidas:
        q = q.filter(Notificacion.leida == False)  # noqa: E712

    items = q.order_by(Notificacion.fecha.desc()).limit(limite).all()
    return items, total_no_leidas, total_registros


def revisar_y_generar_vencimientos(
    db: Session, hoy: Optional[date] = None
) -> int:
    fecha_hoy = hoy or date.today()
    str_hoy = fecha_hoy.strftime("%Y-%m-%d")
    dias_alerta = getattr(settings, "DIAS_ALERTA_VENCIMIENTO", 15)
    notificaciones_generadas = 0

    certificados = (
        db.query(Certificado)
        .join(Personal, Certificado.legajo_persona == Personal.legajo)
        .filter(Personal.activo == True)  # noqa: E712
        .all()
    )
    for cert in certificados:
        if not cert.fechaVencimiento:
            continue
        fecha_v = _a_fecha(cert.fechaVencimiento)
        dias = (fecha_v - fecha_hoy).days
        if dias <= dias_alerta:
            tipo_nombre = (
                cert.tipo_relacion.nombre
                if cert.tipo_relacion
                else f"Certificado #{cert.id}"
            )
            persona_nombre = (
                f"{cert.persona.nombre} {cert.persona.apellido}".strip()
                if cert.persona
                else f"Legajo {cert.legajo_persona}"
            )
            es_plaga_agua = any(
                w in tipo_nombre.lower()
                for w in ("plaga", "agua", "fumig", "potabil")
            )
            tipo_notif = (
                TipoNotificacion.VENCIMIENTO_PLAGAS_AGUA
                if es_plaga_agua
                else TipoNotificacion.VENCIMIENTO_PERSONAL
            )
            titulo = (
                "Control de Plagas y Agua"
                if es_plaga_agua
                else "Vencimiento de Personal"
            )
            mensaje = (
                f"El certificado '{tipo_nombre}' de {persona_nombre} "
                f"{_describir_plazo(dias)} ({fecha_v.strftime('%d/%m/%Y')})."
            )
            clave_base = f"venc_cert_{cert.id}_{str_hoy}"

            _, nuevas = crear_notificacion_para_admins(
                db,
                titulo=titulo,
                mensaje=mensaje,
                tipo=tipo_notif,
                entidad_tipo="personal",
                entidad_id=cert.legajo_persona,
                clave_base=clave_base,
            )
            notificaciones_generadas += nuevas

    planes = db.query(Plan_de_Calibracion).all()
    for plan in planes:
        fecha_raw = plan.fecha_vencimiento or plan.fecha_mantenimiento
        if not fecha_raw:
            continue
        if plan.equipo and getattr(plan.equipo, "activo", True) is False:
            continue
        fecha_v = _a_fecha(fecha_raw)
        dias = (fecha_v - fecha_hoy).days
        if dias <= dias_alerta:
            equipo_nombre = (
                plan.equipo.nombre if plan.equipo else f"Equipo #{plan.equipo_id}"
            )
            es_plaga_agua = any(
                w in plan.nombre.lower() or w in equipo_nombre.lower()
                for w in ("plaga", "agua", "cisterna", "tanque", "trampa")
            )
            tipo_notif = (
                TipoNotificacion.VENCIMIENTO_PLAGAS_AGUA
                if es_plaga_agua
                else TipoNotificacion.VENCIMIENTO_EQUIPO
            )
            titulo = (
                "Control de Plagas y Agua"
                if es_plaga_agua
                else "Vencimiento de Calibración"
            )
            mensaje = (
                f"La calibración / mantenimiento de '{equipo_nombre}' ({plan.nombre}) "
                f"{_describir_plazo(dias)} ({fecha_v.strftime('%d/%m/%Y')})."
            )
            clave_base = f"venc_plan_cal_{plan.id}_{str_hoy}"

            _, nuevas = crear_notificacion_para_admins(
                db,
                titulo=titulo,
                mensaje=mensaje,
                tipo=tipo_notif,
                entidad_tipo="equipo",
                entidad_id=plan.id,
                clave_base=clave_base,
            )
            notificaciones_generadas += nuevas

    documentos = (
        db.query(Documento).filter(Documento.activo == True).all()  # noqa: E712
    )
    for doc in documentos:
        ver = doc.version_vigente
        if not ver:
            continue
        fecha_base = ver.fecha_vigencia or _a_fecha(ver.creado_el)
        fecha_v = fecha_base + timedelta(days=365)
        dias = (fecha_v - fecha_hoy).days
        if dias <= dias_alerta:
            es_plaga_agua = any(
                w in doc.titulo.lower()
                for w in ("plaga", "agua", "potabil", "desratiz", "fumig")
            )
            tipo_notif = (
                TipoNotificacion.VENCIMIENTO_PLAGAS_AGUA
                if es_plaga_agua
                else TipoNotificacion.VENCIMIENTO_DOCUMENTO
            )
            titulo = (
                "Control de Plagas y Agua"
                if es_plaga_agua
                else "Revisión de Documento"
            )
            mensaje = (
                f"El documento '{doc.titulo}' "
                f"{_describir_plazo(dias)} para su revisión anual ({fecha_v.strftime('%d/%m/%Y')})."
            )
            clave_base = f"venc_doc_{doc.id}_{str_hoy}"

            _, nuevas = crear_notificacion_para_admins(
                db,
                titulo=titulo,
                mensaje=mensaje,
                tipo=tipo_notif,
                entidad_tipo="documento",
                entidad_id=doc.id,
                clave_base=clave_base,
            )
            notificaciones_generadas += nuevas

    elementos = (
        db.query(ElementoDeLimpieza)
        .filter(ElementoDeLimpieza.activo == True)  # noqa: E712
        .all()
    )
    for elem in elementos:
        if not elem.fechaCambio:
            continue
        fecha_v = _a_fecha(elem.fechaCambio)
        dias = (fecha_v - fecha_hoy).days
        if dias <= dias_alerta:
            mensaje = (
                f"El elemento de limpieza '{elem.nombre}' "
                f"{_describir_plazo(dias)} para su recambio ({fecha_v.strftime('%d/%m/%Y')})."
            )
            clave_base = f"venc_elem_{elem.id}_{str_hoy}"

            _, nuevas = crear_notificacion_para_admins(
                db,
                titulo="Recambio de Elemento de Limpieza",
                mensaje=mensaje,
                tipo=TipoNotificacion.VENCIMIENTO_ELEMENTO_LIMPIEZA,
                entidad_tipo="elemento_limpieza",
                entidad_id=elem.id,
                clave_base=clave_base,
            )
            notificaciones_generadas += nuevas

    from src.incidentes.services import listar_incidentes_abiertos

    incidentes_abiertos = listar_incidentes_abiertos(db)
    for inc in incidentes_abiertos:
        if inc.nivel_urgencia == "CRITICO":
            clave_base = f"incidente_critico_{inc.id}_{str_hoy}"
            titulo = "Incidente Crítico Sin Resolver"
            horas_int = int(inc.horas_abierto)
            mensaje = (
                f"El incidente #{inc.id} ({inc.nombre_tipo or 'General'}) "
                f"lleva {horas_int}h sin resolución ({inc.dias_abierto} días)."
            )
            _, nuevas = crear_notificacion_para_admins(
                db,
                titulo=titulo,
                mensaje=mensaje,
                tipo=TipoNotificacion.INCIDENTE_CRITICO,
                entidad_tipo="incidente",
                entidad_id=inc.id,
                clave_base=clave_base,
            )
            notificaciones_generadas += nuevas
        elif inc.nivel_urgencia == "ATENCION":
            clave_base = f"incidente_atencion_{inc.id}_{str_hoy}"
            titulo = "Incidente en Atención"
            horas_int = int(inc.horas_abierto)
            mensaje = (
                f"El incidente #{inc.id} ({inc.nombre_tipo or 'General'}) "
                f"lleva {horas_int}h sin resolución."
            )
            _, nuevas = crear_notificacion_para_admins(
                db,
                titulo=titulo,
                mensaje=mensaje,
                tipo=TipoNotificacion.EVENTO_INCIDENTE,
                entidad_tipo="incidente",
                entidad_id=inc.id,
                clave_base=clave_base,
            )
            notificaciones_generadas += nuevas

    return notificaciones_generadas


def notificar_nuevo_incidente(
    db: Session,
    incidente_id: int,
    tipo_nombre: str,
    descripcion: str,
) -> tuple[List[Notificacion], int]:
    titulo = "Nuevo Incidente Reportado"
    desc_corta = (descripcion or "").strip()
    if len(desc_corta) > 90:
        desc_corta = desc_corta[:87] + "..."
    mensaje = f"Se reportó el incidente #{incidente_id} ({tipo_nombre}): {desc_corta}"
    clave = f"incidente_creado_{incidente_id}"
    return crear_notificacion_para_admins(
        db,
        titulo=titulo,
        mensaje=mensaje,
        tipo=TipoNotificacion.EVENTO_INCIDENTE,
        entidad_tipo="incidente",
        entidad_id=incidente_id,
        clave_base=clave,
    )


def notificar_incidente_reabierto(
    db: Session,
    incidente_id: int,
    motivo: str,
) -> tuple[List[Notificacion], int]:
    titulo = "Incidente Reabierto"
    motivo_corto = (motivo or "").strip()
    if len(motivo_corto) > 90:
        motivo_corto = motivo_corto[:87] + "..."
    mensaje = f"El incidente #{incidente_id} fue reabierto: {motivo_corto}"
    ahora_str = datetime.now().strftime("%Y%m%d%H%M%S")
    clave = f"incidente_reabierto_{incidente_id}_{ahora_str}"
    return crear_notificacion_para_admins(
        db,
        titulo=titulo,
        mensaje=mensaje,
        tipo=TipoNotificacion.INCIDENTE_CRITICO,
        entidad_tipo="incidente",
        entidad_id=incidente_id,
        clave_base=clave,
    )


def notificar_tarea_reasignada(
    db: Session,
    tarea: Tarea,
    nuevo_operador_id: int,
) -> Optional[Notificacion]:
    operador = (
        db.query(Personal)
        .filter(
            Personal.legajo == nuevo_operador_id,
            Personal.activo == True,  # noqa: E712
        )
        .first()
    )
    if not operador:
        return None

    ahora_str = datetime.now().strftime("%Y%m%d%H%M%S")
    clave = f"tarea_reasignada_{tarea.id}_{nuevo_operador_id}_{ahora_str}"
    data = schemas.NotificacionCreate(
        usuario_id=nuevo_operador_id,
        titulo="Tarea Asignada",
        mensaje=f"Se te ha asignado la tarea '{tarea.nombre}' del plan '{tarea.nombre_plan}'.",
        tipo=TipoNotificacion.EVENTO_TAREA_REASIGNADA,
        entidad_tipo="tarea",
        entidad_id=tarea.id,
        clave_duplicado=clave,
    )
    n, _ = crear_notificacion(db, data)
    return n


def notificar_tarea_incumplida_revision(
    db: Session,
    checklist_id: int,
    item_id: int,
    nombre_tarea: str,
    responsable_legajo: Optional[int] = None,
) -> List[Notificacion]:
    str_hoy = date.today().strftime("%Y-%m-%d")
    clave_base = f"tarea_revision_{checklist_id}_{item_id}_{str_hoy}"
    mensaje = f"La tarea '{nombre_tarea}' en el checklist #{checklist_id} se encuentra incumplida / en revisión."

    notificaciones, _ = crear_notificacion_para_admins(
        db,
        titulo="Tarea en Revisión",
        mensaje=mensaje,
        tipo=TipoNotificacion.EVENTO_TAREA_REVISION,
        entidad_tipo="checklist",
        entidad_id=checklist_id,
        clave_base=clave_base,
    )

    if responsable_legajo:
        resp = (
            db.query(Personal)
            .filter(
                Personal.legajo == responsable_legajo,
                Personal.activo == True,  # noqa: E712
            )
            .first()
        )
        if resp and resp.capacidad == Capacidades.OPERAR:
            clave_op = f"{clave_base}_{resp.legajo}"
            notif_op, _ = crear_notificacion(
                db,
                schemas.NotificacionCreate(
                    usuario_id=resp.legajo,
                    titulo="Tarea en Revisión",
                    mensaje=mensaje,
                    tipo=TipoNotificacion.EVENTO_TAREA_REVISION,
                    entidad_tipo="checklist",
                    entidad_id=checklist_id,
                    clave_duplicado=clave_op,
                ),
            )
            if notif_op:
                notificaciones.append(notif_op)

    return notificaciones


def UMBRAL_STOCK_BAJO(unidad: UnidadMedidaEnum) -> float:
    if unidad in (UnidadMedidaEnum.LITROS, UnidadMedidaEnum.KILOGRAMOS, UnidadMedidaEnum.UNIDADES):
        return 10.0
    if unidad in (UnidadMedidaEnum.MILILITROS, UnidadMedidaEnum.GRAMOS):
        return 500.0
    return 10.0


def notificar_stock_bajo_quimico_si_corresponde(
    db: Session, quimico: InsumoQuimico
) -> List[Notificacion]:
    if not quimico.activo:
        return []

    umbral = UMBRAL_STOCK_BAJO(quimico.unidad_medida)
    if quimico.stock_actual <= umbral:
        str_hoy = date.today().strftime("%Y-%m-%d")
        clave_base = f"stock_quimico_{quimico.id}_{str_hoy}"
        mensaje = (
            f"El producto químico '{quimico.nombre}' tiene stock bajo "
            f"({quimico.stock_actual} {quimico.unidad_medida.value})."
        )
        notifs, _ = crear_notificacion_para_admins(
            db,
            titulo="Stock Bajo de Producto Químico",
            mensaje=mensaje,
            tipo=TipoNotificacion.EVENTO_STOCK_QUIMICO,
            entidad_tipo="insumo_quimico",
            entidad_id=quimico.id,
            clave_base=clave_base,
        )
        return notifs
    return []

