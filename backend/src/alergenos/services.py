from datetime import date, datetime, timedelta
import mimetypes
from pathlib import Path
import shutil
from typing import List, Optional
from fastapi import UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select, update
from sqlalchemy import text
from sqlalchemy.orm import Session
from src.alergenos import schemas, exceptions
from src.alergenos.models import Alergeno


def migrar_activo_alergenos(db: Session) -> None:
    engine = db.get_bind()
    with engine.connect() as conn:
        columnas = {row[1] for row in conn.execute(text("PRAGMA table_info(alergenos)")).fetchall()}
        if "activo" not in columnas:
            conn.execute(text("ALTER TABLE alergenos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT 1"))
            conn.commit()



def crear_alergeno(db: Session, alerg:schemas.AlergenoCreate) -> schemas.AlergenoBase:
    migrar_activo_alergenos(db)
    existente = db.scalar(
        select(Alergeno).where(
            Alergeno.activo,
            func.lower(Alergeno.nombre) == alerg.nombre.strip().lower(),
        )
    )
    if existente is not None:
        raise exceptions.Nombre_Duplicado()
    _alerg = Alergeno(**alerg.model_dump())

    db.add(_alerg)
    db.commit()
    db.refresh(_alerg)
    return _alerg


def listar_alergenos(db:Session)-> List[schemas.Alergeno]:
    migrar_activo_alergenos(db)
    return list(db.scalars(select(Alergeno).where(Alergeno.activo)).all())


def leer_alergeno(db:Session, alerg_id:int) -> schemas.Alergeno:
       migrar_activo_alergenos(db)
       db_alg = db.scalar(select(Alergeno).where(Alergeno.id == alerg_id, Alergeno.activo))
       if db_alg is None:
           raise exceptions.Alergenos_cero()
       return db_alg

def actualizar_alergeno(
    db: Session,
    alergeno_id: int,
    alergeno: schemas.AlergenoUpdate,
) -> Alergeno:
    migrar_activo_alergenos(db)
    db_alergeno = leer_alergeno(db, alergeno_id)
    datos = alergeno.model_dump(exclude_unset=True)

    if "nombre" in datos and datos["nombre"] is not None:
        nuevo_nombre = datos["nombre"].strip()
        duplicado = db.scalar(
            select(Alergeno).where(
                func.lower(Alergeno.nombre) == nuevo_nombre.lower(),
                Alergeno.id != alergeno_id,
            )
        )
        if duplicado is not None:
            raise exceptions.Nombre_Duplicado()
        db_alergeno.nombre = nuevo_nombre

    for campo, valor in datos.items():
        if campo != "nombre":
            setattr(db_alergeno, campo, valor)

    if datos:
        db.commit()
        db.refresh(db_alergeno)

    return db_alergeno


def eliminar_alergeno(db: Session, alergeno_id: int) -> Alergeno:
    db_alergeno = leer_alergeno(db, alergeno_id)
    db_alergeno.activo = False
    db.commit()
    db.refresh(db_alergeno)
    return db_alergeno

def obtener_alergenos_para_exportar(
    db: Session, busqueda: Optional[str] = None
) -> List[dict]:
    """Alérgenos activos (filtrados por nombre) con sus tipos de insumo asociados."""
    termino = (busqueda or "").lower().strip()
    filas = []
    for a in listar_alergenos(db):
        if termino and termino not in a.nombre.lower():
            continue
        tipos = sorted(t.nombre for t in a.tipos_insumos if t.activo)
        filas.append(
            {
                "id": a.id,
                "nombre": a.nombre,
                "tipos_insumos": ", ".join(tipos) if tipos else "-",
                "total_tipos": len(tipos),
            }
        )
    return filas
