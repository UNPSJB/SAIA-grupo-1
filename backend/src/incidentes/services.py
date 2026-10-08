import uuid
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.auditoria import schemas as schemas_auditoria
from src.auditoria.models import AccionAuditoria
from src.auditoria.services import registrar_auditoria
from src.autenticacion.dependencies import es_administrador
from src.incidentes import exceptions, models
from src.incidentes.constants import (
    ACCION_CORRECTIVA_MAX,
    DESCRIPCION_MAX,
    FIRMAS_IMAGEN,
    FOTO_MAX_BYTES,
    MOTIVO_REAPERTURA_MAX,
    EstadoIncidente,
)
from src.personal.models import Personal

IMAGENES_DIR = Path(__file__).resolve().parent / "imagenes"
IMAGENES_DIR.mkdir(parents=True, exist_ok=True)


def _normalizar_descripcion(descripcion: str) -> str:
    descripcion = (descripcion or "").strip()
    if not descripcion:
        raise exceptions.DescripcionVacia()
    if len(descripcion) > DESCRIPCION_MAX:
        raise exceptions.DescripcionDemasiadoLarga()
    return descripcion


def _normalizar_accion_correctiva(accion: str) -> str:
    accion = (accion or "").strip()
    if not accion:
        raise exceptions.AccionCorrectivaVacia()
    if len(accion) > ACCION_CORRECTIVA_MAX:
        raise exceptions.AccionCorrectivaDemasiadoLarga()
    return accion


def _normalizar_motivo_reapertura(motivo: str) -> str:
    motivo = (motivo or "").strip()
    if not motivo:
        raise exceptions.MotivoReaperturaVacio()
    if len(motivo) > MOTIVO_REAPERTURA_MAX:
        raise exceptions.MotivoReaperturaDemasiadoLargo()
    return motivo


def _es_cerrado(estado: EstadoIncidente | str) -> bool:
    val = estado.value if hasattr(estado, "value") else str(estado).lower()
    return val in (EstadoIncidente.CERRADO.value, EstadoIncidente.RESUELTO.value, "cerrado", "resuelto")


def _leer_foto(foto: Optional[UploadFile]) -> Optional[tuple[bytes, str]]:
    """Devuelve (contenido, extension) de la foto, o None si no se adjuntó ninguna."""
    if foto is None:
        return None
    contenido = foto.file.read(FOTO_MAX_BYTES + 1)
    if not contenido and not foto.filename:
        return None  # el navegador envía una parte vacía cuando no se eligió archivo
    if len(contenido) > FOTO_MAX_BYTES:
        raise exceptions.ImagenDemasiadoGrande()
    for firma, extension in FIRMAS_IMAGEN.items():
        if contenido.startswith(firma):
            return contenido, extension
    raise exceptions.FormatoImagenInvalido()


def _borrar_foto(nombre: Optional[str]) -> None:
    if not nombre:
        return
    try:
        (IMAGENES_DIR / Path(nombre).name).unlink(missing_ok=True)
    except OSError:
        pass


def _obtener(db: Session, incidente_id: int) -> models.Incidente:
    incidente = db.get(models.Incidente, incidente_id)
    if incidente is None:
        raise exceptions.IncidenteNoEncontrado()
    return incidente


def crear_incidente(
    db: Session, usuario: Personal, descripcion: str, foto: Optional[UploadFile] = None
) -> models.Incidente:
    descripcion = _normalizar_descripcion(descripcion)
    archivo = _leer_foto(foto)

    nombre_foto = None
    if archivo:
        contenido, extension = archivo
        nombre_foto = f"inc_{uuid.uuid4().hex}{extension}"
        (IMAGENES_DIR / nombre_foto).write_bytes(contenido)

    incidente = models.Incidente(
        descripcion=descripcion,
        foto=nombre_foto,
        estado=EstadoIncidente.PENDIENTE,
        reportado_por_id=usuario.legajo,
    )
    try:
        db.add(incidente)
        db.commit()
    except Exception:
        db.rollback()
        _borrar_foto(nombre_foto)
        raise
    db.refresh(incidente)
    return incidente


def listar_incidentes(
    db: Session,
    usuario: Personal,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    estado: Optional[EstadoIncidente] = None,
    reportado_por_id: Optional[int] = None,
) -> List[models.Incidente]:
    if desde and hasta and desde > hasta:
        raise exceptions.RangoFechasInvalido()

    consulta = select(models.Incidente)
    if es_administrador(usuario):
        if reportado_por_id is not None:
            consulta = consulta.where(models.Incidente.reportado_por_id == reportado_por_id)
    else:
        # el operador solo ve lo que reportó, sin importar los filtros que mande
        consulta = consulta.where(models.Incidente.reportado_por_id == usuario.legajo)

    if desde:
        consulta = consulta.where(models.Incidente.creado_el >= datetime.combine(desde, time.min))
    if hasta:
        # "hasta" es inclusivo: llega hasta el final de ese día
        fin = datetime.combine(hasta + timedelta(days=1), time.min)
        consulta = consulta.where(models.Incidente.creado_el < fin)
    if estado:
        consulta = consulta.where(models.Incidente.estado == estado)

    consulta = consulta.order_by(models.Incidente.creado_el.desc(), models.Incidente.id.desc())
    return list(db.scalars(consulta).all())


def obtener_incidente(db: Session, usuario: Personal, incidente_id: int) -> models.Incidente:
    incidente = db.get(models.Incidente, incidente_id)
    # a un operador un incidente ajeno le figura como inexistente
    if incidente is None or (
        not es_administrador(usuario) and incidente.reportado_por_id != usuario.legajo
    ):
        raise exceptions.IncidenteNoEncontrado()
    return incidente


def editar_descripcion(db: Session, incidente_id: int, descripcion: str) -> models.Incidente:
    incidente = _obtener(db, incidente_id)
    incidente.descripcion = _normalizar_descripcion(descripcion)
    db.commit()
    db.refresh(incidente)
    return incidente


def cambiar_estado(db: Session, incidente_id: int, estado: EstadoIncidente) -> models.Incidente:
    incidente = _obtener(db, incidente_id)
    estado_previo = incidente.estado.value if hasattr(incidente.estado, "value") else str(incidente.estado)
    incidente.estado = estado

    registrar_auditoria(
        db,
        schemas_auditoria.AuditoriaCreate(
            tabla="incidentes",
            registro_id=incidente.id,
            accion=AccionAuditoria.MODIFICAR,
            campo="estado",
            valor_previo=estado_previo,
            valor_posterior=estado.value if hasattr(estado, "value") else str(estado),
        ),
        commit=False,
    )

    db.commit()
    db.refresh(incidente)
    return incidente


def cerrar_incidente(
    db: Session, usuario: Personal, incidente_id: int, accion_correctiva: str
) -> models.Incidente:
    incidente = _obtener(db, incidente_id)
    if _es_cerrado(incidente.estado):
        raise exceptions.IncidenteYaCerrado()

    texto_accion = _normalizar_accion_correctiva(accion_correctiva)
    estado_previo = incidente.estado.value if hasattr(incidente.estado, "value") else str(incidente.estado)

    incidente.accion_correctiva = texto_accion
    incidente.cerrado_el = datetime.now()
    incidente.resuelto_por_id = usuario.legajo
    incidente.estado = EstadoIncidente.CERRADO

    # Log de auditoría
    registrar_auditoria(
        db,
        schemas_auditoria.AuditoriaCreate(
            tabla="incidentes",
            registro_id=incidente.id,
            accion=AccionAuditoria.MODIFICAR,
            campo="estado",
            valor_previo=estado_previo,
            valor_posterior=EstadoIncidente.CERRADO.value,
        ),
        commit=False,
    )

    db.commit()
    db.refresh(incidente)
    return incidente


def reabrir_incidente(
    db: Session, usuario: Personal, incidente_id: int, motivo: str
) -> models.Incidente:
    incidente = _obtener(db, incidente_id)
    if not _es_cerrado(incidente.estado) and incidente.estado != EstadoIncidente.DESCARTADO:
        raise exceptions.IncidenteNoCerrado()

    texto_motivo = _normalizar_motivo_reapertura(motivo)
    estado_previo = incidente.estado.value if hasattr(incidente.estado, "value") else str(incidente.estado)

    incidente.motivo_reapertura = texto_motivo
    incidente.estado = EstadoIncidente.REABIERTO

    # Log de auditoría con la reapertura y el motivo
    registrar_auditoria(
        db,
        schemas_auditoria.AuditoriaCreate(
            tabla="incidentes",
            registro_id=incidente.id,
            accion=AccionAuditoria.MODIFICAR,
            campo="estado",
            valor_previo=estado_previo,
            valor_posterior=EstadoIncidente.REABIERTO.value,
        ),
        commit=False,
    )

    db.commit()
    db.refresh(incidente)
    return incidente


def eliminar_incidente(db: Session, incidente_id: int) -> None:
    incidente = _obtener(db, incidente_id)
    nombre_foto = incidente.foto
    db.delete(incidente)
    db.commit()
    _borrar_foto(nombre_foto)


def obtener_foto(db: Session, usuario: Personal, incidente_id: int) -> FileResponse:
    incidente = obtener_incidente(db, usuario, incidente_id)
    if not incidente.foto:
        raise exceptions.FotoNoEncontrada()
    ruta = (IMAGENES_DIR / Path(incidente.foto).name).resolve()
    if not ruta.is_file() or IMAGENES_DIR.resolve() not in ruta.parents:
        raise exceptions.FotoNoEncontrada()
    return FileResponse(ruta)
