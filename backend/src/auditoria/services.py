from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session
from src.auditoria.models import Auditoria
from src.auditoria import schemas, exceptions


# operaciones para Auditoria (registro de solo lectura/escritura, sin update/delete: es inmutable)


def registrar_auditoria(
    db: Session, auditoria: schemas.AuditoriaCreate, commit: bool = True
) -> Auditoria:
    # commit=False permite que el llamador incluya el registro en su propia
    # transaccion (se guarda junto con el cambio auditado, o no se guarda).
    _auditoria = Auditoria(**auditoria.model_dump())
    db.add(_auditoria)
    if commit:
        db.commit()
        db.refresh(_auditoria)
    return _auditoria


def listar_auditorias(
    db: Session, tabla: Optional[str] = None, registro_id: Optional[int] = None
) -> List[Auditoria]:
    query = select(Auditoria)
    if tabla is not None:
        query = query.where(Auditoria.tabla == tabla)
    if registro_id is not None:
        query = query.where(Auditoria.registro_id == registro_id)
    return list(db.scalars(query).all())


def leer_auditoria(db: Session, auditoria_id: int) -> Auditoria:
    db_auditoria = db.scalar(select(Auditoria).where(Auditoria.id == auditoria_id))
    if db_auditoria is None:
        raise exceptions.AuditoriaNoEncontrada()
    return db_auditoria
