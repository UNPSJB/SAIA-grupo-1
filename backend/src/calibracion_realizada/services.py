from datetime import date, datetime, timedelta
import mimetypes
from pathlib import Path
import shutil
from typing import List, Optional
from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from src.calibracion_realizada import schemas, exceptions
from src.calibracion_realizada.models import Calibracion_Realizada
from src.plan_de_calibracion.services import calcular_fecha_vencimiento, Obtener_plan

ARCHIVOS_DIR = Path(__file__).resolve().parent / "archivos"
ARCHIVOS_DIR.mkdir(parents=True, exist_ok=True)


def guardar_archivo_calibracion(formato_archivo: UploadFile) -> str:
    nombre_seguro = Path(formato_archivo.filename or "certificado.pdf").name
    ruta_destino = ARCHIVOS_DIR / nombre_seguro
    with open(ruta_destino, "wb") as buffer:
        shutil.copyfileobj(formato_archivo.file, buffer)
    return f"/calibracion_realizada/archivos/{nombre_seguro}"


def obtener_archivo_calibracion(nombre_archivo: str, inline: bool = False) -> FileResponse:
    nombre_seguro = Path(nombre_archivo).name
    ruta_completa = (ARCHIVOS_DIR / nombre_seguro).resolve()
    if not ruta_completa.is_file() or not str(ruta_completa).startswith(str(ARCHIVOS_DIR.resolve())):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    tipo_media, _ = mimetypes.guess_type(str(ruta_completa))
    if not tipo_media:
        tipo_media = "application/pdf" if ruta_completa.suffix.lower() == ".pdf" else "application/octet-stream"
    if inline:
        headers = {"Content-Disposition": f'inline; filename="{nombre_seguro}"'}
        return FileResponse(
            path=ruta_completa,
            media_type=tipo_media,
            headers=headers,
        )
    return FileResponse(
        path=ruta_completa,
        media_type=tipo_media,
        filename=nombre_seguro,
    )


def calibracion_realizada(db: Session, cal: schemas.CalibracionRealizadaCreate) -> schemas.CalibracionRealizada:
    _cal = Calibracion_Realizada(**cal.model_dump())
    db_plan = Obtener_plan(db, _cal.plan_calibracion_id)

    db_plan.fecha_vencimiento = calcular_fecha_vencimiento(_cal.fecha_d_realizacion, db_plan.periodicidad_De_cambio)
    db.add(_cal)
    db.commit()
    db.refresh(_cal)
    return _cal


def listar_calibraciones_realizadas(db: Session) -> List[schemas.CalibracionRealizada]:
    return list(db.scalars(select(Calibracion_Realizada)).all())


def Obtener_CalibracionRealizada(db: Session, cal_id: int) -> schemas.CalibracionRealizada:
    db_cal = db.scalar(select(Calibracion_Realizada).where(Calibracion_Realizada.id == cal_id))
    if db_cal is None:
        raise exceptions.Calibracion_No_Encontrada()
    return db_cal
