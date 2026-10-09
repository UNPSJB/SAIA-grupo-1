import logging
import uuid
from datetime import date
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.certificado import exceptions, schemas
from src.certificado.models import Certificado
from src.personal.models import Personal

ARCHIVOS_DIR = Path(__file__).resolve().parent / "archivos"
ARCHIVOS_DIR.mkdir(parents=True, exist_ok=True)


def guardar_archivo_certificado(file: UploadFile) -> str:
  extension = Path(file.filename or "").suffix.lower()
  tipos_validos = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
  }

  if extension not in tipos_validos:
    if file.content_type == "application/pdf":
      extension = ".pdf"
    elif file.content_type in ["image/jpeg", "image/png", "image/webp"]:
      extension = f".{file.content_type.split('/')[-1]}"
    else:
      raise ValueError("Formato no válido. Debe ser JPG, PNG, WEBP o PDF.")

  contenido = file.file.read()
  if not contenido:
    raise ValueError("El archivo está vacío.")

  nombre_nuevo = f"cert_{uuid.uuid4().hex[:10]}{extension}"
  ruta_destino = ARCHIVOS_DIR / nombre_nuevo
  with open(ruta_destino, "wb") as f:
    f.write(contenido)

  return f"/certificados/archivos/{nombre_nuevo}"


def obtener_archivo_certificado(nombre_archivo: str) -> FileResponse:
  nombre_seguro = Path(nombre_archivo).name
  ruta = (ARCHIVOS_DIR / nombre_seguro).resolve()
  if not ruta.is_file() or not str(ruta).startswith(str(ARCHIVOS_DIR.resolve())):
    raise exceptions.CertificadoNoEncontrado()

  media_type = "application/pdf" if ruta.suffix.lower() == ".pdf" else None
  return FileResponse(ruta, media_type=media_type)


# CRUD de Certificados

def crear_certificado(
    db: Session,
    tipo: str,
    fechaVencimiento: date,
    legajo_persona: int,
    archivo: Optional[UploadFile] = None,
) -> Certificado:
  persona = db.scalar(
      select(Personal).where(Personal.legajo == legajo_persona)
  )
  if persona is None:
    raise exceptions.PersonaNoExiste()

  ruta_guardada = None
  if archivo and archivo.filename:
    ruta_guardada = guardar_archivo_certificado(archivo)

  _certificado = Certificado(
      tipo=tipo,
      fechaVencimiento=fechaVencimiento,
      legajo_persona=legajo_persona,
      foto_url=ruta_guardada,
  )
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


def editar_certificado(
    db: Session,
    certificado_id: int,
    tipo: str,
    fechaVencimiento: date,
    archivo: Optional[UploadFile] = None,
) -> Certificado:
  db_certificado = obtener_certificado(db, certificado_id)

  datos_actualizar = {
      "tipo": tipo,
      "fechaVencimiento": fechaVencimiento,
  }

  if archivo and archivo.filename:
    if db_certificado.foto_url and db_certificado.foto_url.startswith("/certificados/archivos/"):
      nombre_previo = Path(db_certificado.foto_url).name
      ruta_previa = ARCHIVOS_DIR / nombre_previo
      if ruta_previa.is_file():
        try:
          ruta_previa.unlink()
        except OSError:
          pass
    datos_actualizar["foto_url"] = guardar_archivo_certificado(archivo)

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
  if db_certificado.foto_url and db_certificado.foto_url.startswith("/certificados/archivos/"):
    nombre = Path(db_certificado.foto_url).name
    ruta = ARCHIVOS_DIR / nombre
    if ruta.is_file():
      try:
        ruta.unlink()
      except OSError:
        pass

  db.execute(delete(Certificado).where(Certificado.id == certificado_id))
  db.commit()