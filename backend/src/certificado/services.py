import logging
from typing import List, Optional
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.certificado import exceptions, schemas
from src.certificado.models import Certificado
from src.personal.models import Personal

# CRUD de Certificados

def crear_certificado(db: Session, certificado: schemas.CertificadoCreate) -> Certificado:
  # Validar que la persona exista antes de asociarle el certificado
  persona = db.scalar(
      select(Personal).where(Personal.legajo == certificado.legajo_persona)
  )
  if persona is None:
    raise exceptions.PersonaNoExiste()

  datos = certificado.model_dump()
  _certificado = Certificado(**datos)
  db.add(_certificado)
  db.commit()
  db.refresh(_certificado)
  return _certificado


def listar_certificados(db: Session, legajo_persona: Optional[int] = None) -> List[Certificado]:
  c = select(Certificado)
  if legajo_persona is not None:
    c = c.where(Certificado.legajo_persona == legajo_persona)
  return db.scalars(c).all()


def obtener_certificado(db: Session, certificado_id: int) -> Certificado:
  db_certificado = db.scalar(
      select(Certificado).where(Certificado.id == certificado_id)
  )
  if db_certificado is None:
    raise exceptions.CertificadoNoEncontrado()
  return db_certificado


def editar_certificado(db: Session, certificado_id: int, certificado: schemas.CertificadoUpdate) -> Certificado:
  db_certificado = obtener_certificado(db, certificado_id)

  datos_actualizar = certificado.model_dump(exclude_unset=True)

  if datos_actualizar:
    db.execute(
        update(Certificado)
        .where(Certificado.id == certificado_id)
        .values(**datos_actualizar)
    )
    db.commit()
    db.refresh(db_certificado)

  return db_certificado


def eliminar_certificado(db: Session, certificado_id: int) -> None:
  db_certificado = obtener_certificado(db, certificado_id)
  db.execute(delete(Certificado).where(Certificado.id == certificado_id))
  db.commit()