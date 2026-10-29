from typing import List
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from src.motivoNoRealizado import exceptions, models, schemas

def crear_motivo(db: Session, datos: schemas.MotivoCreate) -> models.MotivoNoRealizado:
    nombre_limpio = " ".join(datos.nombre.split())
    if not nombre_limpio:
        raise exceptions.NombreVacio()

    nombre_sin_espacios = nombre_limpio.replace(" ", "").lower()
    existente = db.scalar(
        select(models.MotivoNoRealizado).where(
            func.lower(func.replace(models.MotivoNoRealizado.nombre, " ", ""))
            == nombre_sin_espacios
        )
    )
    if existente:
        raise exceptions.MotivoYaExiste()

    motivo = models.MotivoNoRealizado(
        nombre=nombre_limpio,
        activo=True,
    )
    db.add(motivo)
    db.commit()
    db.refresh(motivo)
    return motivo

def listar_motivos(db: Session, solo_activos: bool = False) -> List[models.MotivoNoRealizado]:
    query = select(models.MotivoNoRealizado).order_by(models.MotivoNoRealizado.nombre.asc())
    if solo_activos:
        query = query.where(models.MotivoNoRealizado.activo == True)
    return list(db.scalars(query).all())

def obtener_motivo(db: Session, motivo_id: int) -> models.MotivoNoRealizado:
    motivo = db.scalar(
        select(models.MotivoNoRealizado).where(models.MotivoNoRealizado.id == motivo_id)
    )
    if not motivo:
        raise exceptions.MotivoNoEncontrado()
    return motivo

def cambiar_estado_motivo(db: Session, motivo_id: int, activo: bool) -> models.MotivoNoRealizado:
    motivo = obtener_motivo(db, motivo_id)
    if not activo and motivo.nombre.strip().lower() in ("otro", "otro motivo"):
        raise exceptions.MotivoSistemaNoDesactivable()

    motivo.activo = activo
    db.commit()
    db.refresh(motivo)
    return motivo
