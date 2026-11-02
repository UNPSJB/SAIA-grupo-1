import logging
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.certificado import exceptions, schemas
from src.certificado.models import Certificado
from src.personal.models import Personal 

ARCHIVOS_DIR = Path(__file__).resolve().parent / "archivos"
ARCHIVOS_DIR.mkdir(parents=True, exist_ok=True)

def obtener_certificados_para_csv(
    db: Session,
    legajo_persona: Optional[int] = None,
    busqueda: Optional[str] = None,
    filtro_estado: Optional[str] = None
) -> List[Dict[str, Any]]:
    
    certificados = listar_certificados(db, legajo_persona=legajo_persona)

    # Cargar mapa de personal
    try:
        personales = db.scalars(select(Personal)).all()
        personal_map = {
            p.legajo: f"{getattr(p, 'apellido', '')}, {getattr(p, 'nombre', '')}".strip(", ")
            for p in personales
        }
    except Exception:
        personal_map = {}

    filas = []
    term = busqueda.lower().strip() if busqueda else None
    hoy = date.today()

    for c in certificados:
        legajo = getattr(c, "legajo_persona", None)
        nombre_persona = personal_map.get(legajo, f"Legajo #{legajo}") if legajo else "-"
        
        # Obtener el nombre del tipo de certificado de forma segura
        tipo_str = getattr(c, "tipo", "")
        if not tipo_str and getattr(c, "tipo_relacion", None):
            tipo_str = c.tipo_relacion.nombre
        tipo_str = str(tipo_str or "")

        # Filtro de búsqueda
        if term:
            coincide = (
                term in tipo_str.lower()
                or term in nombre_persona.lower()
                or (legajo and term in str(legajo))
            )
            if not coincide:
                continue

        # Cálculo de estado de vencimiento
        f_venc = getattr(c, "fechaVencimiento", None)
        str_venc = f_venc.strftime("%Y-%m-%d") if hasattr(f_venc, "strftime") and f_venc else "Sin fecha"
        estado_venc = "AL_DIA"

        if f_venc and hasattr(f_venc, "days"):
            diff_dias = (f_venc - hoy).days
            if diff_dias <= 0:
                estado_venc = "VENCIDO"
            elif diff_dias <= 15:
                estado_venc = "PROXIMO"

        # Filtro de estado
        if filtro_estado and filtro_estado != "TODOS":
            if estado_venc != filtro_estado.upper():
                continue

        filas.append({
            "id": c.id,
            "legajo_persona": legajo or "-",
            "nombre_persona": nombre_persona,
            "tipo": tipo_str,
            "fecha_vencimiento": str_venc,
            "estado_vencimiento": estado_venc.replace("_", " ").capitalize(),
            "tiene_archivo": "Sí" if getattr(c, "foto_url", None) else "No"
        })

    return filas

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
    id_tipo: int,
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
      id_tipo=id_tipo,
      fechaVencimiento=fechaVencimiento,
      legajo_persona=legajo_persona,
      foto_url=ruta_guardada,
  )
  db.add(_certificado)
  db.commit()
  db.refresh(_certificado)

  if getattr(_certificado, "tipo_relacion", None):
    _certificado.tipo = _certificado.tipo_relacion.nombre

  return _certificado


def listar_certificados(db: Session, legajo_persona: Optional[int] = None) -> List[Certificado]:
  c = select(Certificado)
  if legajo_persona is not None:
    c = c.where(Certificado.legajo_persona == legajo_persona)
  certificados = db.scalars(c).all()

  for cert in certificados:
    if getattr(cert, "tipo_relacion", None):
      cert.tipo = cert.tipo_relacion.nombre

  return certificados


def obtener_certificado(db: Session, certificado_id: int) -> Certificado:
  db_certificado = db.scalar(
      select(Certificado).where(Certificado.id == certificado_id)
  )
  if db_certificado is None:
    raise exceptions.CertificadoNoEncontrado()

  if getattr(db_certificado, "tipo_relacion", None):
    db_certificado.tipo = db_certificado.tipo_relacion.nombre

  return db_certificado


def editar_certificado(
    db: Session,
    certificado_id: int,
    id_tipo: int,
    fechaVencimiento: date,
    archivo: Optional[UploadFile] = None,
) -> Certificado:
  db_certificado = obtener_certificado(db, certificado_id)

  datos_actualizar = {
      "id_tipo": id_tipo,
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

  if getattr(db_certificado, "tipo_relacion", None):
    db_certificado.tipo = db_certificado.tipo_relacion.nombre

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