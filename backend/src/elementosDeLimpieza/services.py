import logging
from typing import List, Literal, Optional, Dict, Any
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session
from src.elementosDeLimpieza.models import ElementoDeLimpieza
from src.elementosDeLimpieza import schemas, exceptions, models
from datetime import datetime, timedelta
 
#CRUD de Elementos de Limpieza

def obtener_elementos_para_csv(
    db: Session,
    busqueda: Optional[str] = None,
    estado: Optional[str] = None
) -> List[Dict[str, Any]]:
    
    query = select(ElementoDeLimpieza)
    elementos = db.scalars(query).all()
    filas = []
    term = busqueda.lower().strip() if busqueda else None

    for elem in elementos:
        nombre = getattr(elem, "nombre", "") or ""
        
        # Filtro por búsqueda de nombre
        if term and term not in nombre.lower():
            continue

        # Filtro por estado
        if estado and estado != "TODOS":
            if estado.upper() == "ACTIVO" and not elem.activo:
                continue
            elif estado.upper() == "INACTIVO" and elem.activo:
                continue

        # Formatear fecha de cambio
        fecha_cambio_str = "-"
        if getattr(elem, "fechaCambio", None):
            fecha_cambio_str = elem.fechaCambio.strftime("%Y-%m-%d")

        frecuencia_str = (
            f"{elem.frecuenciaDeCambio} días"
            if getattr(elem, "frecuenciaDeCambio", None) is not None
            else "Sin especificar"
        )

        filas.append({
            "id": elem.id,
            "nombre": nombre,
            "frecuenciaDeCambio": frecuencia_str,
            "proximoRecambio": fecha_cambio_str,
            "estado": "Activo" if elem.activo else "Inactivo",
        })

    return filas

def calcular_fecha_cambio(frecuencia: Optional[int]) -> Optional[datetime]:
    if frecuencia is not None and frecuencia > 0:
        return datetime.now() + timedelta(days=frecuencia)
    return None

def crear_elementoDeLimpieza(db: Session, elementoDeLimpieza: schemas.ElementoDeLimpiezaCreate) -> schemas.ElementoDeLimpieza:

    datos = elementoDeLimpieza.model_dump()
    
    datos["fechaCambio"] = calcular_fecha_cambio(elementoDeLimpieza.frecuenciaDeCambio)

    _elementoDeLimpieza =ElementoDeLimpieza(**datos)
    db.add(_elementoDeLimpieza)
    db.commit()
    db.refresh(_elementoDeLimpieza)
    return _elementoDeLimpieza

def listar_elementosDeLimpiezas(db: Session) -> List[schemas.ElementoDeLimpieza]:
    return db.scalars(select(ElementoDeLimpieza)).all() 

def obtener_elementoDeLimpieza(db: Session, elementoDeLimpieza_id: int) -> schemas.ElementoDeLimpieza:
    db_elementoDeLimpieza = db.scalar(select(ElementoDeLimpieza).where(ElementoDeLimpieza.id ==elementoDeLimpieza_id))
    if db_elementoDeLimpieza is None:
        raise exceptions.ElementoNoEncontrado()
    return db_elementoDeLimpieza

def editar_elementoDeLimpieza(db: Session, elementoDeLimpieza_id: int, elementoDeLimpieza: schemas.ElementoDeLimpiezaUpdate) -> schemas.ElementoDeLimpieza:
    db_elementoDeLimpieza = obtener_elementoDeLimpieza(db, elementoDeLimpieza_id)

    datos_actualizar = elementoDeLimpieza.model_dump(exclude_unset=True)

    if "frecuenciaDeCambio" in datos_actualizar:
        nueva_frecuencia = datos_actualizar["frecuenciaDeCambio"]
        frecuencia_anterior = db_elementoDeLimpieza.frecuenciaDeCambio

        if nueva_frecuencia != frecuencia_anterior:
            datos_actualizar["fechaCambio"] = calcular_fecha_cambio(nueva_frecuencia)
        else:
            datos_actualizar.pop("fechaCambio", None)

    db.execute(
        update(ElementoDeLimpieza).where(ElementoDeLimpieza.id ==elementoDeLimpieza_id).values(**datos_actualizar)
    )
    db.commit()
    db.refresh(db_elementoDeLimpieza)
    return db_elementoDeLimpieza

def eliminar_elementoDeLimpieza(db: Session, elementoDeLimpieza_id: int) -> schemas.ElementoDeLimpieza:
    db_elementoDeLimpieza = obtener_elementoDeLimpieza(db, elementoDeLimpieza_id)
    if db_elementoDeLimpieza:
            db_elementoDeLimpieza.activo = False
            db.commit()
            db.refresh(db_elementoDeLimpieza)
    
    return db_elementoDeLimpieza

def registrar_cambio_fecha(db: Session, elemento_id: int) -> ElementoDeLimpieza:
    elemento = obtener_elementoDeLimpieza(db, elemento_id)
    
    # Recalcula la fecha sumando la frecuencia a partir de ahora
    if elemento.frecuenciaDeCambio and elemento.frecuenciaDeCambio > 0:
        elemento.fechaCambio = datetime.now() + timedelta(days=elemento.frecuenciaDeCambio)
    else:
        elemento.fechaCambio = None

    db.commit()
    db.refresh(elemento)
    return elemento
