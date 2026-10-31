import uuid
from datetime import date, timedelta, datetime
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.controlesAmbientales import exceptions, models, schemas
from src.controlesAmbientales.models import ControlAmbiental, VisitaControlAmbiental, TipoControlAmbiental

STORAGE_DIR = Path(__file__).resolve().parent / "certificados"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

EXTENSIONES_PERMITIDAS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}

def validar_y_guardar_certificado(file: UploadFile) -> str:
    nombre_original = file.filename or "certificado.pdf"
    ext = Path(nombre_original).suffix.lower()
    
    if ext not in EXTENSIONES_PERMITIDAS:
        raise exceptions.FormatoCertificadoInvalido()
        
    contenido = file.file.read()
    if not contenido:
        raise exceptions.ArchivoVacio()
        
    nombre_disco = f"cert_amb_{uuid.uuid4().hex[:10]}{ext}"
    ruta_destino = STORAGE_DIR / nombre_disco

    with open(ruta_destino, "wb") as f:
        f.write(contenido)

    return f"/controles-ambientales/certificados/{nombre_disco}"


def crear_control_ambiental(
    db: Session,
    tipo: TipoControlAmbiental,
    periodicidad_dias: int,
    observaciones: Optional[str] = None,
    fecha_realizacion_inicial: Optional[date] = None,
    file: Optional[UploadFile] = None
) -> ControlAmbiental:
    if periodicidad_dias <= 0:
        raise exceptions.PeriodicidadInvalida()

    existente = db.scalar(select(ControlAmbiental).where(ControlAmbiental.tipo == tipo.value))
    if existente:
        if not existente.activo:
            raise exceptions.ControlExisteinactivo()
        raise exceptions.ControlYaExiste()

    nuevo_control = ControlAmbiental(
        tipo=tipo.value,
        periodicidad_dias=periodicidad_dias,
        observaciones=observaciones.strip() if observaciones else None
    )
    db.add(nuevo_control)
    db.flush()

    if fecha_realizacion_inicial:
        cert_url = validar_y_guardar_certificado(file) if file else None
        vencimiento = fecha_realizacion_inicial + timedelta(days=periodicidad_dias)

        primera_visita = VisitaControlAmbiental(
            control_id=nuevo_control.id,
            fecha_realizacion=fecha_realizacion_inicial,
            fecha_proximo_vencimiento=vencimiento,
            certificado_url=cert_url,
            observaciones=observaciones.strip() if observaciones else None
        )
        db.add(primera_visita)

        nuevo_control.ultima_fecha_realizacion = fecha_realizacion_inicial
        nuevo_control.fecha_vencimiento = vencimiento

    db.commit()
    db.refresh(nuevo_control)
    return nuevo_control


def registrar_visita_control(
    db: Session,
    control_id: int,
    fecha_realizacion: date,
    file: Optional[UploadFile] = None,
    observaciones: Optional[str] = None
) -> VisitaControlAmbiental:
    control = db.scalar(select(ControlAmbiental).where(ControlAmbiental.id == control_id))
    if not control:
        raise exceptions.ControlNoEncontrado()

    if not fecha_realizacion:
        raise exceptions.FechaRequerida()

    cert_url = validar_y_guardar_certificado(file) if file else None
    proximo_vencimiento = fecha_realizacion + timedelta(days=control.periodicidad_dias)

    nueva_visita = VisitaControlAmbiental(
        control_id=control.id,
        fecha_realizacion=fecha_realizacion,
        fecha_proximo_vencimiento=proximo_vencimiento,
        certificado_url=cert_url,
        observaciones=observaciones.strip() if observaciones else None
    )
    db.add(nueva_visita)

    # Actualizar la fecha del próximo vencimiento en el control principal
    control.ultima_fecha_realizacion = fecha_realizacion
    control.fecha_vencimiento = proximo_vencimiento

    db.commit()
    db.refresh(nueva_visita)
    return nueva_visita


def listar_controles(
    db: Session,
    busqueda: Optional[str] = None,
    filtro_activo: Optional[str] = None
) -> List[ControlAmbiental]:
    query = select(ControlAmbiental)

    if filtro_activo == "ACTIVOS":
        query = query.where(ControlAmbiental.activo == True)
    elif filtro_activo == "INACTIVOS":
        query = query.where(ControlAmbiental.activo == False)

    if busqueda:
        term = f"%{busqueda.strip()}%"
        query = query.where(ControlAmbiental.tipo.ilike(term))

    return list(db.scalars(query.order_by(ControlAmbiental.id.asc())).all())


def obtener_control(db: Session, control_id: int) -> ControlAmbiental:
    control = db.scalar(select(ControlAmbiental).where(ControlAmbiental.id == control_id))
    if not control:
        raise exceptions.ControlNoEncontrado()
    return control


def actualizar_control_ambiental(
    db: Session,
    control_id: int,
    tipo: Optional[TipoControlAmbiental] = None,
    periodicidad_dias: Optional[int] = None,
    observaciones: Optional[str] = None
) -> ControlAmbiental:
    control = obtener_control(db, control_id)

    if periodicidad_dias is not None:
        if periodicidad_dias <= 0:
            raise exceptions.PeriodicidadInvalida()
        control.periodicidad_dias = periodicidad_dias
        
        if control.ultima_fecha_realizacion:
            control.fecha_vencimiento = control.ultima_fecha_realizacion + timedelta(days=periodicidad_dias)

    if tipo is not None:
        control.tipo = tipo.value
    if observaciones is not None:
        control.observaciones = observaciones.strip() if observaciones else None

    db.commit()
    db.refresh(control)
    return control


def eliminar_control_ambiental(db: Session, control_id: int) -> ControlAmbiental:
    control = obtener_control(db, control_id)
    control.activo = False
    db.commit()
    db.refresh(control)
    return control


def reactivar_control_ambiental(db: Session, control_id: int) -> ControlAmbiental:
    control = obtener_control(db, control_id)
    control.activo = True
    db.commit()
    db.refresh(control)
    return control


def obtener_controles_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    tipo: Optional[str] = None,
    filtro_estado: Optional[str] = None,
    filtro_activo: Optional[str] = None
) -> List[Dict[str, Any]]:
    
    controles = listar_controles(db, busqueda=busqueda, filtro_activo=filtro_activo)
    hoy = date.today()
    resultado = []

    tipo_map = {
        "CONTROL_PLAGAS": "Control de Plagas",
        "ANALISIS_AGUA": "Análisis de Agua",
        "LIMPIEZA_TANQUE": "Limpieza de Tanque",
    }

    for c in controles:
        if tipo and tipo != "TODOS" and c.tipo != tipo:
            continue

        tipo_str = tipo_map.get(c.tipo, c.tipo)
        fecha_venc = c.fecha_vencimiento

        if not fecha_venc:
            estado_clave = "AL_DIA"
            urgencia_texto = "Sin visitas registradas"
            fecha_venc_str = "Sin vencimiento"
        else:
            fecha_venc_str = fecha_venc.strftime("%Y-%m-%d")
            diff_dias = (fecha_venc - hoy).days
            if diff_dias < 0:
                estado_clave = "VENCIDOS"
                urgencia_texto = f"Vencido ({abs(diff_dias)} d)"
            elif diff_dias <= 15:
                estado_clave = "PROXIMOS"
                urgencia_texto = f"Vence en {diff_dias} días"
            else:
                estado_clave = "AL_DIA"
                urgencia_texto = "Al día"
                
        if filtro_estado and filtro_estado != "TODOS" and estado_clave != filtro_estado:
            continue

        resultado.append({
            "id": c.id,
            "tipo": tipo_str,
            "estado_registro": "Activo" if c.activo else "Inactivo",
            "periodicidad": f"Cada {c.periodicidad_dias} días",
            "ultima_realizacion": c.ultima_fecha_realizacion.strftime("%Y-%m-%d") if c.ultima_fecha_realizacion else "—",
            "proximo_vencimiento": fecha_venc_str,
            "urgencia": urgencia_texto,
            "total_visitas": len(c.visitas) if c.visitas else 0,
            "observaciones": c.observaciones or "—"
        })

    return resultado