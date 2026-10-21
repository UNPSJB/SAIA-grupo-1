from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import List, Optional, Tuple
import uuid
from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.auditoria import schemas as schemas_auditoria
from src.auditoria.models import AccionAuditoria
from src.auditoria.services import registrar_auditoria
from src.autenticacion.dependencies import es_administrador
from src.incidentes import exceptions, models, schemas
from src.incidentes.constants import (
    ACCION_CORRECTIVA_MAX,
    DESCRIPCION_MAX,
    ETIQUETAS_TIPO,
    FIRMAS_IMAGEN,
    FOTO_MAX_BYTES,
    MOTIVO_REAPERTURA_MAX,
    EstadoIncidente,
    TipoIncidente,
)
from src.personal.models import Personal

IMAGENES_DIR = Path(__file__).resolve().parent / "imagenes"
IMAGENES_DIR.mkdir(parents=True, exist_ok=True)


def _normalizar_descripcion(descripcion: str) -> str:
    texto = (descripcion or "").strip()
    if not texto:
        raise exceptions.DescripcionVacia()
    if len(texto) > DESCRIPCION_MAX:
        raise exceptions.DescripcionDemasiadoLarga()
    return texto


def _normalizar_accion_correctiva(accion: str) -> str:
    texto = (accion or "").strip()
    if not texto:
        raise exceptions.AccionCorrectivaVacia()
    if len(texto) > ACCION_CORRECTIVA_MAX:
        raise exceptions.AccionCorrectivaDemasiadoLarga()
    return texto


def _normalizar_motivo_reapertura(motivo: str) -> str:
    texto = (motivo or "").strip()
    if not texto:
        raise exceptions.MotivoReaperturaVacio()
    if len(texto) > MOTIVO_REAPERTURA_MAX:
        raise exceptions.MotivoReaperturaDemasiadoLargo()
    return texto


def _es_cerrado(estado: EstadoIncidente | str) -> bool:
    val = estado.value if hasattr(estado, "value") else str(estado).lower()
    return val in (EstadoIncidente.CERRADO.value, EstadoIncidente.RESUELTO.value, "cerrado", "resuelto")


def _leer_foto(foto: Optional[UploadFile]) -> Optional[Tuple[bytes, str]]:
    if foto is None:
        return None
    contenido = foto.file.read(FOTO_MAX_BYTES + 1)
    if not contenido and not foto.filename:
        return None
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
    db: Session,
    usuario: Personal,
    descripcion: str,
    foto: Optional[UploadFile] = None,
    tipo: Optional[TipoIncidente] = None,
    categoria_id: Optional[int] = None,
) -> models.Incidente:
    desc = _normalizar_descripcion(descripcion)
    archivo = _leer_foto(foto)

    nombre_foto = None
    if archivo:
        contenido, extension = archivo
        nombre_foto = f"inc_{uuid.uuid4().hex}{extension}"
        (IMAGENES_DIR / nombre_foto).write_bytes(contenido)

    tipo_final = tipo if isinstance(tipo, TipoIncidente) else TipoIncidente.OTRO
    if isinstance(tipo, str):
        try:
            tipo_final = TipoIncidente(tipo.lower())
        except ValueError:
            tipo_final = TipoIncidente.OTRO

    cat_id_final = categoria_id
    if cat_id_final is not None:
        from src.categorias_incidentes.models import CategoriaIncidente
        cat_obj = db.get(CategoriaIncidente, cat_id_final)
        if cat_obj:
            cat_nom_lower = cat_obj.nombre.lower()
            for t_enum, etiqueta in ETIQUETAS_TIPO.items():
                primer_palabra = etiqueta.split('/')[0].strip().lower()
                if primer_palabra in cat_nom_lower or t_enum.value in cat_nom_lower:
                    tipo_final = t_enum
                    break
    elif tipo_final:
        from src.categorias_incidentes.models import CategoriaIncidente
        cat_nombre_esperado = ETIQUETAS_TIPO.get(tipo_final)
        if cat_nombre_esperado:
            cat = db.scalar(
                select(CategoriaIncidente).where(
                    CategoriaIncidente.nombre.ilike(f"%{cat_nombre_esperado.split('/')[0].strip()}%")
                )
            )
            if cat:
                cat_id_final = cat.id

    incidente = models.Incidente(
        descripcion=desc,
        tipo=tipo_final,
        categoria_id=cat_id_final,
        foto=nombre_foto,
        estado=EstadoIncidente.PENDIENTE,
        reportado_por_id=usuario.legajo,
    )
    try:
        db.add(incidente)
        db.commit()
        db.refresh(incidente)
    except Exception:
        db.rollback()
        _borrar_foto(nombre_foto)
        raise
    return incidente


def obtener_incidente(db: Session, usuario: Personal, incidente_id: int) -> models.Incidente:
    incidente = _obtener(db, incidente_id)
    if not es_administrador(usuario) and incidente.reportado_por_id != usuario.legajo:
        raise exceptions.IncidenteNoEncontrado()
    return incidente


def obtener_foto(db: Session, usuario: Personal, incidente_id: int) -> FileResponse:
    incidente = obtener_incidente(db, usuario, incidente_id)
    if not incidente.foto:
        raise exceptions.FotoNoEncontrada()
    ruta = (IMAGENES_DIR / Path(incidente.foto).name).resolve()
    if not ruta.is_file() or IMAGENES_DIR.resolve() not in ruta.parents:
        raise exceptions.FotoNoEncontrada()
    return FileResponse(ruta)


def listar_incidentes(
    db: Session,
    usuario: Personal,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    estado: Optional[EstadoIncidente] = None,
    reportado_por_id: Optional[int] = None,
    tipo: Optional[TipoIncidente] = None,
) -> List[models.Incidente]:
    if desde and hasta and desde > hasta:
        raise exceptions.RangoFechasInvalido()

    consulta = select(models.Incidente)

    if not es_administrador(usuario):
        consulta = consulta.where(models.Incidente.reportado_por_id == usuario.legajo)
    else:
        if reportado_por_id is not None:
            consulta = consulta.where(models.Incidente.reportado_por_id == reportado_por_id)

    if desde is not None:
        inicio = datetime.combine(desde, time.min)
        consulta = consulta.where(models.Incidente.creado_el >= inicio)

    if hasta is not None:
        fin = datetime.combine(hasta + timedelta(days=1), time.min)
        consulta = consulta.where(models.Incidente.creado_el < fin)

    if estado is not None:
        consulta = consulta.where(models.Incidente.estado == estado)

    if tipo is not None:
        consulta = consulta.where(models.Incidente.tipo == tipo)

    consulta = consulta.order_by(models.Incidente.creado_el.desc(), models.Incidente.id.desc())
    return list(db.scalars(consulta).all())


def editar_descripcion(db: Session, incidente_id: int, nueva_descripcion: str) -> models.Incidente:
    incidente = _obtener(db, incidente_id)
    incidente.descripcion = _normalizar_descripcion(nueva_descripcion)
    db.commit()
    db.refresh(incidente)
    return incidente


def cambiar_estado(
    db: Session,
    incidente_id: int,
    nuevo_estado: EstadoIncidente,
) -> models.Incidente:
    incidente = _obtener(db, incidente_id)
    estado_previo = incidente.estado.value if hasattr(incidente.estado, "value") else str(incidente.estado)
    incidente.estado = nuevo_estado

    registrar_auditoria(
        db,
        schemas_auditoria.AuditoriaCreate(
            tabla="incidentes",
            registro_id=incidente.id,
            accion=AccionAuditoria.MODIFICAR,
            campo="estado",
            valor_previo=estado_previo,
            valor_posterior=nuevo_estado.value if hasattr(nuevo_estado, "value") else str(nuevo_estado),
        ),
        commit=False,
    )

    db.commit()
    db.refresh(incidente)
    return incidente


def cerrar_incidente(
    db: Session,
    usuario: Personal,
    incidente_id: int,
    accion_correctiva: str,
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
    db: Session,
    usuario: Personal,
    incidente_id: int,
    motivo: str,
) -> models.Incidente:
    incidente = _obtener(db, incidente_id)
    if not _es_cerrado(incidente.estado) and incidente.estado != EstadoIncidente.DESCARTADO:
        raise exceptions.IncidenteNoCerrado()

    texto_motivo = _normalizar_motivo_reapertura(motivo)
    estado_previo = incidente.estado.value if hasattr(incidente.estado, "value") else str(incidente.estado)

    incidente.motivo_reapertura = texto_motivo
    incidente.cerrado_el = None
    incidente.estado = EstadoIncidente.REABIERTO

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
    foto_a_borrar = incidente.foto
    db.delete(incidente)
    db.commit()
    _borrar_foto(foto_a_borrar)


def calcular_antiguedad_y_urgencia(creado_el: datetime) -> Tuple[float, int, str]:
    ahora = datetime.now()
    diferencia = ahora - creado_el
    horas = max(0.0, round(diferencia.total_seconds() / 3600.0, 1))
    dias = max(0, diferencia.days)

    if horas >= 72.0:
        nivel = "CRITICO"
    elif horas >= 24.0:
        nivel = "ATENCION"
    else:
        nivel = "RECIENTE"
    return horas, dias, nivel


def listar_incidentes_abiertos(db: Session) -> List[schemas.IncidenteAbierto]:
    consulta = (
        select(models.Incidente)
        .where(
            models.Incidente.estado.in_([
                EstadoIncidente.PENDIENTE,
                EstadoIncidente.EN_REVISION,
                EstadoIncidente.REABIERTO,
            ]),
            models.Incidente.cerrado_el.is_(None),
        )
        .order_by(models.Incidente.creado_el.asc(), models.Incidente.id.asc())
    )
    filas = list(db.scalars(consulta).all())
    resultado: List[schemas.IncidenteAbierto] = []
    for inc in filas:
        horas, dias, nivel = calcular_antiguedad_y_urgencia(inc.creado_el)
        datos = schemas.Incidente.model_validate(inc).model_dump()
        datos["horas_abierto"] = horas
        datos["dias_abierto"] = dias
        datos["nivel_urgencia"] = nivel
        resultado.append(schemas.IncidenteAbierto(**datos))
    return resultado


def obtener_metricas_incidentes_abiertos(db: Session) -> schemas.IncidentesMetricas:
    abiertos = listar_incidentes_abiertos(db)
    total = len(abiertos)

    menos_24h = sum(1 for i in abiertos if i.horas_abierto < 24.0)
    entre_24h_y_72h = sum(1 for i in abiertos if 24.0 <= i.horas_abierto < 72.0)
    mas_72h = sum(1 for i in abiertos if i.horas_abierto >= 72.0)

    por_estado = {
        EstadoIncidente.PENDIENTE.value: 0,
        EstadoIncidente.EN_REVISION.value: 0,
        EstadoIncidente.REABIERTO.value: 0,
    }
    for i in abiertos:
        val = i.estado.value if hasattr(i.estado, "value") else str(i.estado)
        por_estado[val] = por_estado.get(val, 0) + 1

    mas_antiguo_horas = abiertos[0].horas_abierto if abiertos else None
    mas_antiguo_id = abiertos[0].id if abiertos else None

    return schemas.IncidentesMetricas(
        total_abiertos=total,
        por_antiguedad=schemas.MetricasAntiguedad(
            menos_24h=menos_24h,
            entre_24h_y_72h=entre_24h_y_72h,
            mas_72h=mas_72h,
        ),
        por_estado=por_estado,
        mas_antiguo_horas=mas_antiguo_horas,
        mas_antiguo_id=mas_antiguo_id,
    )


def obtener_estadisticas_por_tipo(
    db: Session,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> schemas.EstadisticaIncidentesPorTipo:
    if desde and hasta and desde > hasta:
        raise exceptions.RangoFechasInvalido()

    consulta = select(models.Incidente)
    if desde:
        consulta = consulta.where(models.Incidente.creado_el >= datetime.combine(desde, time.min))
    if hasta:
        fin = datetime.combine(hasta + timedelta(days=1), time.min)
        consulta = consulta.where(models.Incidente.creado_el < fin)

    incidentes = list(db.scalars(consulta).all())
    total = len(incidentes)

    conteo: dict[TipoIncidente, int] = {t: 0 for t in TipoIncidente}
    for inc in incidentes:
        t = inc.tipo if isinstance(inc.tipo, TipoIncidente) else TipoIncidente.OTRO
        conteo[t] = conteo.get(t, 0) + 1

    items: List[schemas.EstadisticaTipoItem] = []
    for t in TipoIncidente:
        cant = conteo.get(t, 0)
        pct = round((cant / total) * 100, 1) if total > 0 else 0.0
        items.append(
            schemas.EstadisticaTipoItem(
                tipo=t,
                nombre=ETIQUETAS_TIPO.get(t, t.value.capitalize()),
                cantidad=cant,
                porcentaje=pct,
            )
        )

    items.sort(key=lambda x: (-x.cantidad, x.nombre))

    return schemas.EstadisticaIncidentesPorTipo(
        total=total,
        periodo_desde=desde,
        periodo_hasta=hasta,
        por_tipo=items,
    )


def listar_incidentes_por_tipo(
    db: Session,
    tipo: TipoIncidente,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> List[models.Incidente]:
    if desde and hasta and desde > hasta:
        raise exceptions.RangoFechasInvalido()

    consulta = select(models.Incidente).where(models.Incidente.tipo == tipo)
    if desde:
        consulta = consulta.where(models.Incidente.creado_el >= datetime.combine(desde, time.min))
    if hasta:
        fin = datetime.combine(hasta + timedelta(days=1), time.min)
        consulta = consulta.where(models.Incidente.creado_el < fin)

    consulta = consulta.order_by(models.Incidente.creado_el.desc(), models.Incidente.id.desc())
    return list(db.scalars(consulta).all())
