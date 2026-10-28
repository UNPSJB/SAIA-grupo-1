import logging
from typing import List, Literal, Optional, Dict, Any
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.equipos.models import Equipo, Estado
from src.equipos import schemas, exceptions
from src.sectores.models import Sector
from src.sectores.exceptions import SectorNoEncontrado

def obtener_equipos_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    categoria: Optional[str] = None,
    estado: Optional[str] = None
) -> List[Dict[str, Any]]:
   
    query = select(Equipo)
    equipos = db.scalars(query).all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for eq in equipos:
        nombre = getattr(eq, "nombre", "") or ""
        cat = getattr(eq, "categoria", "") or ""
        
        # Resolver nombre de ubicación / sector
        ubicacion_nombre = ""
        if getattr(eq, "sector", None):
            ubicacion_nombre = eq.sector.nombre
        elif getattr(eq, "ubicacion", None):
            ubicacion_nombre = getattr(eq.ubicacion, "nombre", "") or str(eq.ubicacion)

        # Resolver plan de limpieza
        plan_nombre = ""
        if getattr(eq, "plan_de_Limpieza", None):
            plan_nombre = getattr(eq.plan_de_Limpieza, "nombre", "") or ""

        # Filtro por búsqueda
        if term:
            coincide = (
                term in nombre.lower()
                or term in ubicacion_nombre.lower()
                or term in cat.lower()
                or term in plan_nombre.lower()
            )
            if not coincide:
                continue

        # Filtro por categoría
        if categoria and categoria != "TODOS":
            if cat.lower() != categoria.lower():
                continue

        # Filtro por estado
        estado_val = str(getattr(eq, "estado", "") or "").lower()
        if hasattr(eq.estado, "value"):
            estado_val = str(eq.estado.value).lower()

        if estado and estado != "TODOS":
            if estado_val != estado.lower():
                continue

        filas.append({
            "id": eq.id,
            "nombre": nombre,
            "ubicacion": ubicacion_nombre or "-",
            "categoria": cat or "-",
            "plan_de_limpieza": plan_nombre or "Sin plan asignado",
            "estado": estado_val.capitalize() if estado_val else "Inactivo",
        })

    return filas

def crear_equipo(db: Session, equipo: schemas.EquipoCreate) -> schemas.Equipo:
    datos = equipo.model_dump()
    datos.pop("ubicacion_id", None)
    datos.pop("plan_de_calibracion", None)
    sector_id = datos.get("sector_id")
    ubicacion_val = datos.pop("ubicacion", None)
    if sector_id is None and isinstance(ubicacion_val, str) and ubicacion_val.strip():
        sector = db.scalar(select(Sector).where(Sector.nombre == ubicacion_val.strip()))
        if sector is None:
            sector = Sector(nombre=ubicacion_val.strip())
            db.add(sector)
            db.flush()
        sector_id = sector.id
    if sector_id is None:
        raise exceptions.CadenaMayorOigualACUATRO()
    sector_obj = db.scalar(select(Sector).where(Sector.id == sector_id))
    if sector_obj is None:
        raise SectorNoEncontrado()
    datos["sector_id"] = sector_id
    _equipo = Equipo(**datos)
    db.add(_equipo)
    db.commit()
    db.refresh(_equipo)
    return _equipo

def listar_equipos(db: Session, estado: Optional[Estado] = None) -> List[schemas.Equipo]:
    query = select(Equipo)
    if estado is not None:
        query = query.where(Equipo.estado == estado)
    return list(db.scalars(query).all())

def obtener_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = db.scalar(select(Equipo).where(Equipo.id == equipo_id))
    if db_equipo is None:
        raise exceptions.EquipoNoEncontrado()
    return db_equipo

def editar_equipo(db: Session, equipo_id: int, equipo: schemas.EquipoUpdate) -> schemas.Equipo:
    db_equipo = obtener_equipo(db, equipo_id)
    datos = equipo.model_dump(exclude_unset=True)
    datos.pop("ubicacion_id", None)
    datos.pop("plan_de_calibracion", None)
    ubicacion_val = datos.pop("ubicacion", None)
    if "sector_id" in datos and datos["sector_id"] is not None:
        sector_id = datos["sector_id"]
    elif isinstance(ubicacion_val, str) and ubicacion_val.strip():
        sector = db.scalar(select(Sector).where(Sector.nombre == ubicacion_val.strip()))
        if sector is None:
            sector = Sector(nombre=ubicacion_val.strip())
            db.add(sector)
            db.flush()
        sector_id = sector.id
        datos["sector_id"] = sector_id
    else:
        sector_id = None
    if sector_id is not None:
        sector_obj = db.scalar(select(Sector).where(Sector.id == sector_id))
        if sector_obj is None:
            raise SectorNoEncontrado()
    if datos:
        db.execute(
            update(Equipo).where(Equipo.id == equipo_id).values(**datos)
        )
        db.commit()
        db.refresh(db_equipo)
    return db_equipo

def eliminar_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = obtener_equipo(db, equipo_id)
    if db_equipo:
        db_equipo.estado = Estado.INACTIVO
        db.commit()
        db.refresh(db_equipo)
    return db_equipo

def reactivar_equipo(db: Session, equipo_id: int) -> schemas.Equipo:
    db_equipo = obtener_equipo(db, equipo_id)
    if db_equipo:
        db_equipo.estado = Estado.ACTIVO
        db.commit()
        db.refresh(db_equipo)
    return db_equipo