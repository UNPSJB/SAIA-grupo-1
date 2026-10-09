from typing import List
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.tipoCertificado import exceptions, schemas
from src.tipoCertificado.models import TipoCertificado
from src.certificado.models import Certificado

def crear_tipo_certificado(db: Session, nombre: str) -> TipoCertificado:
  nombre_limpio = nombre.strip()
  if not nombre_limpio:
    raise exceptions.NombreVacio()

  existente = db.scalar(
      select(TipoCertificado).where(TipoCertificado.nombre == nombre_limpio)
  )
  if existente:
    raise exceptions.TipoCertificadoYaExiste()

  _tipo = TipoCertificado(nombre=nombre_limpio)
  db.add(_tipo)
  db.commit()
  db.refresh(_tipo)
  return _tipo


def listar_tipos_certificados(db: Session) -> List[TipoCertificado]:
  return db.scalars(select(TipoCertificado).order_by(TipoCertificado.nombre.asc())).all()


def obtener_tipo_certificado(db: Session, tipo_id: int) -> TipoCertificado:
  db_tipo = db.scalar(
      select(TipoCertificado).where(TipoCertificado.id == tipo_id)
  )
  if db_tipo is None:
    raise exceptions.TipoCertificadoNoEncontrado()
  return db_tipo


def eliminar_tipo_certificado(db: Session, tipo_id: int) -> None:
  db_tipo = obtener_tipo_certificado(db, tipo_id)

  # Validar que no existan certificados asociados antes de eliminar
  en_uso = db.scalar(
      select(Certificado).where(Certificado.id_tipo == tipo_id)
  )
  if en_uso:
    raise exceptions.TipoCertificadoEnUso()

  db.execute(delete(TipoCertificado).where(TipoCertificado.id == tipo_id))
  db.commit()